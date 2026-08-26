/**
 * PROTOTYPE — pure logic for "Prototype: Stripe event edge cases (async
 * payments, refunds, expired sessions)". Throwaway; keep this file pure (no
 * I/O, no terminal code) so the transition logic can be lifted into the real
 * write path later. The TUI shell (tui.ts) is the throwaway part.
 *
 * QUESTION:
 * How should the orders write path handle the Stripe events the checkout
 * replacement deliberately deferred — async payment outcomes, refunds, and
 * expired/abandoned sessions — and when does the first-writer-wins DO NOTHING
 * upsert switch to DO UPDATE status transitions?
 *
 * The model this prototype pushes:
 *   - First write (webhook `checkout.session.completed` OR the return-page fast
 *     path, both via recordOrder) is INSERT ... ON CONFLICT (session_id) DO
 *     NOTHING. It freezes the non-status columns.
 *   - Every later event is a targeted status transition — DO UPDATE on the
 *     mutable status columns only, never the frozen ones, never via the
 *     recordOrder path (a stale completed event must not clobber a newer status).
 *   - Refund events (charge.refunded, refund.*) reference a payment_intent, and
 *     the PaymentIntent has no reverse link to its Checkout Session — so the
 *     orders table must capture payment_intent_id at first write or refunds
 *     cannot be reconciled to a row.
 *
 * Facts verified against docs.stripe.com (2026-08-25):
 *   - Session `status`: open | complete | expired. There is no "abandoned"
 *     value (the orders migration comment lists one — worth fixing).
 *   - Session `payment_status`: paid | unpaid | no_payment_required, plus
 *     `processing` while a delayed payment method is pending.
 *   - Delayed methods: checkout.session.completed fires with payment_status
 *     `processing`; checkout.session.async_payment_succeeded / _failed resolve
 *     it (data.object is a Checkout Session in both).
 *   - charge.refunded: data.object is a Charge (refunded bool, amount_refunded,
 *     refunds list, payment_intent). Fires on partial AND full refunds.
 *   - refund.created / refund.updated / refund.failed: data.object is a Refund
 *     (status: pending | requires_action | succeeded | failed | canceled).
 *   - Session `recovered_from`: set on a NEW session created as a recovery of an
 *     expired one (only when recovery is enabled; embedded Checkout recovery is
 *     an open question). `collected_information` may carry customer details
 *     gathered before expiry.
 */

export type SessionStatus = "open" | "complete" | "expired"
export type PaymentStatus =
  | "paid"
  | "unpaid"
  | "no_payment_required"
  | "processing"
export type RefundStatus = "none" | "pending" | "partial" | "refunded"
export type RefundLifecycle =
  | "pending"
  | "requires_action"
  | "succeeded"
  | "failed"
  | "canceled"

export type RefundState = {
  id: string
  amount: number // cents
  status: RefundLifecycle
  reason: string | null
}

/**
 * The orders row as this prototype sees it: the frozen identity/amount columns
 * plus the mutable status slice. Everything outside the MUTABLE_STATUS list is
 * set once at first write and never updated by an event handler.
 */
export type OrderRow = {
  session_id: string
  amount_total: number // cents — frozen; needed to derive refund_status
  payment_intent_id: string | null // frozen once set at first write
  payment_status: PaymentStatus | null
  session_status: SessionStatus | null
  refunded_amount: number // cents — mutable
  refund_status: RefundStatus // mutable
  refunds: RefundState[] // mutable; only if the JSONB refunds detail is kept
}

/** Columns written once at first write; no event handler may touch them. */
export const FROZEN_AT_FIRST_WRITE = [
  "session_id",
  "client_reference_id",
  "flow",
  "currency",
  "amount_total",
  "amount_tax",
  "line_items",
  "registration",
  "shipping",
  "customer_email",
  "customer_name",
  "payment_intent_id", // captured at first write; immutable once set
  "created_at",
] as const

/** Columns event handlers may transition after the first write. */
export const MUTABLE_STATUS = [
  "payment_status",
  "session_status",
  "refunded_amount",
  "refund_status",
  "refunds",
  "updated_at",
] as const

// --- Stripe payload shapes (the subset each event carries) ---

export type SessionPayload = {
  id: string
  status: SessionStatus | null
  payment_status: PaymentStatus | null
  payment_intent: string | null
  amount_total: number // cents — present on the session object at any status
  collected_information: Record<string, unknown> | null
  recovered_from: string | null
}

export type ChargePayload = {
  id: string
  payment_intent: string | null
  refunded: boolean
  amount_refunded: number
  refunds: RefundState[]
}

export type RefundPayload = RefundState & { payment_intent: string | null }

export type EventName =
  | "checkout.session.completed"
  | "checkout.session.async_payment_succeeded"
  | "checkout.session.async_payment_failed"
  | "checkout.session.expired"
  | "charge.refunded"
  | "refund.created"
  | "refund.updated"
  | "refund.failed"

export type EventInput = {
  name: EventName
  payload: SessionPayload | ChargePayload | RefundPayload
}

export type HandlerOptions = {
  /** Policy for expired sessions with no row: insert a lead row vs ack-and-drop. */
  recordExpired?: boolean
}

// --- Write plans: the DO NOTHING vs DO UPDATE decision, rendered as SQL ---

export type WritePlan = {
  mode: "INSERT_DO_NOTHING" | "UPDATE" | "NO_OP"
  lookup: "session_id" | "payment_intent_id" | null
  columns: string[]
  sql: string
  note?: string
}

export type HandlerResult = {
  row: OrderRow | null
  plans: WritePlan[]
}

function quote(v: string | null | undefined): string {
  return v === null || v === undefined ? "null" : `'${v}'`
}

function insertDoNothingSql(row: OrderRow): string {
  return [
    `insert into orders (session_id, payment_status, session_status, payment_intent_id, amount_total, `,
    `  line_items, registration, shipping)`,
    `values (${quote(row.session_id)}, ${quote(row.payment_status)}, ${quote(
      row.session_status
    )}, `,
    `  ${quote(row.payment_intent_id)}, ${
      row.amount_total
    }, '[...]', null, null)`,
    `on conflict (session_id) do nothing;`,
  ].join("\n")
}

function updateSql(row: OrderRow, changed: Partial<OrderRow>): string {
  const sets: string[] = []
  for (const key of Object.keys(changed) as (keyof OrderRow)[]) {
    const value = changed[key]
    if (key === "refunds") {
      sets.push(`refunds = ${JSON.stringify(value)}`)
    } else if (key === "refunded_amount") {
      sets.push(`refunded_amount = ${value}`)
    } else {
      sets.push(`${key} = ${quote(value as string | null)}`)
    }
  }
  sets.push("updated_at = now()")
  return `update orders\nset ${sets.join(
    ",\n    "
  )}\nwhere session_id = ${quote(row.session_id)};`
}

function refundUpdateSql(
  paymentIntentId: string,
  changed: {
    refunded_amount: number
    refund_status: RefundStatus
    refunds: RefundState[]
  }
): string {
  return [
    `update orders`,
    `set refunded_amount = ${changed.refunded_amount},`,
    `    refund_status = '${changed.refund_status}',`,
    `    refunds = ${JSON.stringify(changed.refunds)},`,
    `    updated_at = now()`,
    `where payment_intent_id = ${quote(paymentIntentId)};`,
  ].join("\n")
}

// --- Transitions ---

function freshRow(session: SessionPayload): OrderRow {
  return {
    session_id: session.id,
    amount_total: session.amount_total,
    payment_intent_id: session.payment_intent,
    payment_status: session.payment_status,
    session_status: session.status,
    refunded_amount: 0,
    refund_status: "none",
    refunds: [],
  }
}

/** Derives aggregate refund state from the per-refund list (idempotent). */
export function deriveRefundState(
  refunds: RefundState[],
  amountTotal: number
): { refunded_amount: number; refund_status: RefundStatus } {
  // Failed/canceled refunds don't move money.
  const active = refunds.filter(
    (r) => r.status !== "failed" && r.status !== "canceled"
  )
  const refunded = active.reduce((sum, r) => sum + r.amount, 0)
  const anyPending = active.some(
    (r) => r.status === "pending" || r.status === "requires_action"
  )
  let status: RefundStatus = "none"
  if (refunded > 0) {
    status =
      refunded >= amountTotal ? "refunded" : anyPending ? "pending" : "partial"
  } else if (anyPending) {
    status = "pending"
  }
  return { refunded_amount: refunded, refund_status: status }
}

/** Upserts a single refund into the list and re-derives the aggregate. */
export function upsertRefund(
  refunds: RefundState[],
  refund: RefundState
): RefundState[] {
  const idx = refunds.findIndex((r) => r.id === refund.id)
  if (idx === -1) return [...refunds, refund]
  const next = [...refunds]
  next[idx] = refund
  return next
}

/**
 * Applies one webhook event to the row (null when no row exists yet) and
 * returns the resulting row plus the SQL write plans the real handler would
 * execute. Pure — callers simulate the DB.
 */
export function handleEvent(
  row: OrderRow | null,
  event: EventInput,
  options: HandlerOptions = {}
): HandlerResult {
  const recordExpired = options.recordExpired ?? false

  switch (event.name) {
    case "checkout.session.completed": {
      const session = event.payload as SessionPayload
      const next = freshRow(session)
      // DO NOTHING — even when the row already exists, the upsert absorbs it.
      // Both writers (webhook + fast path) retrieve the session fresh, so the
      // first writer's snapshot is authoritative at write time.
      return {
        row: row ?? next,
        plans: [
          {
            mode: "INSERT_DO_NOTHING",
            lookup: "session_id",
            columns: [...FROZEN_AT_FIRST_WRITE, ...MUTABLE_STATUS],
            sql: insertDoNothingSql(next),
          },
        ],
      }
    }

    case "checkout.session.async_payment_succeeded":
    case "checkout.session.async_payment_failed": {
      const session = event.payload as SessionPayload
      if (!row) {
        // Defensive: the completed event should have landed first. recordOrder
        // is the fallback (its DO NOTHING inserts the missing row), then the
        // transition applies.
        const inserted = freshRow(session)
        const changed = { payment_status: session.payment_status }
        const next: OrderRow = { ...inserted, ...changed }
        return {
          row: next,
          plans: [
            {
              mode: "INSERT_DO_NOTHING",
              lookup: "session_id",
              columns: [...FROZEN_AT_FIRST_WRITE, ...MUTABLE_STATUS],
              sql: insertDoNothingSql(inserted),
              note: "no row yet — fall back to recordOrder first",
            },
            {
              mode: "UPDATE",
              lookup: "session_id",
              columns: ["payment_status"],
              sql: updateSql(next, changed),
            },
          ],
        }
      }
      const changed: Partial<OrderRow> = {
        payment_status: session.payment_status,
      }
      const next: OrderRow = { ...row, ...changed }
      return {
        row: next,
        plans: [
          {
            mode: "UPDATE",
            lookup: "session_id",
            columns: ["payment_status"],
            sql: updateSql(next, changed),
            note:
              event.name === "checkout.session.async_payment_succeeded"
                ? "session_status stays complete; payment_status → paid"
                : "session_status stays complete; payment_status → unpaid",
          },
        ],
      }
    }

    case "checkout.session.expired": {
      const session = event.payload as SessionPayload
      if (!row) {
        if (!recordExpired) {
          // Current behavior: no order row for abandoned sessions. The expired
          // payload's collected_information (email/name) is dropped.
          return {
            row: null,
            plans: [
              {
                mode: "NO_OP",
                lookup: null,
                columns: [],
                sql: "-- ack; no order row exists and recordExpired is off\n-- collected_information is dropped with the event",
                note: "DECISION: record abandoned sessions as lead rows? (toggle with [t])",
              },
            ],
          }
        }
        // Lead-row policy: capture the abandoned session so collected
        // information survives for follow-up.
        const next = freshRow(session)
        return {
          row: next,
          plans: [
            {
              mode: "INSERT_DO_NOTHING",
              lookup: "session_id",
              columns: [...FROZEN_AT_FIRST_WRITE, ...MUTABLE_STATUS],
              sql: insertDoNothingSql(next),
              note: "policy recordExpired=true: abandoned session recorded with status=expired",
            },
          ],
        }
      }
      const changed: Partial<OrderRow> = {
        session_status: "expired",
        payment_status: "unpaid",
      }
      const next: OrderRow = { ...row, ...changed }
      return {
        row: next,
        plans: [
          {
            mode: "UPDATE",
            lookup: "session_id",
            columns: ["session_status", "payment_status"],
            sql: updateSql(next, changed),
            note: "terminal state — a completed session never expires, so this cannot race a completed write",
          },
        ],
      }
    }

    case "charge.refunded": {
      const charge = event.payload as ChargePayload
      if (!row) {
        // Anomaly: refunds presuppose a completed payment, so the row should
        // exist. There is no PaymentIntent → Checkout Session link to recover
        // from, so this needs an alert, not a silent ack.
        return {
          row: null,
          plans: [
            {
              mode: "NO_OP",
              lookup: null,
              columns: [],
              sql:
                "-- ALERT: charge.refunded for unknown payment_intent " +
                charge.payment_intent +
                "\n-- no PaymentIntent → session link exists; reconcile manually",
              note: "row missing — flag for manual reconciliation",
            },
          ],
        }
      }
      const next: OrderRow = {
        ...row,
        refunds: charge.refunds,
        ...deriveRefundState(charge.refunds, row.amount_total),
      }
      return {
        row: next,
        plans: [
          {
            mode: "UPDATE",
            lookup: "payment_intent_id",
            columns: ["refunded_amount", "refund_status", "refunds"],
            sql: refundUpdateSql(
              charge.payment_intent ?? row.payment_intent_id ?? "",
              {
                refunded_amount: next.refunded_amount,
                refund_status: next.refund_status,
                refunds: next.refunds,
              }
            ),
            note: charge.refunded
              ? "fully refunded"
              : "partial refund — charge.refunded fires for both",
          },
        ],
      }
    }

    case "refund.created":
    case "refund.updated":
    case "refund.failed": {
      const refund = event.payload as RefundPayload
      if (!row) {
        return {
          row: null,
          plans: [
            {
              mode: "NO_OP",
              lookup: null,
              columns: [],
              sql:
                "-- ALERT: refund." +
                event.name.split(".")[1] +
                " for unknown payment_intent " +
                refund.payment_intent +
                "\n-- reconcile manually (no PaymentIntent → session link)",
              note: "row missing — flag for manual reconciliation",
            },
          ],
        }
      }
      const refunds = upsertRefund(row.refunds, refund)
      const next: OrderRow = {
        ...row,
        refunds,
        ...deriveRefundState(refunds, row.amount_total),
      }
      return {
        row: next,
        plans: [
          {
            mode: "UPDATE",
            lookup: "payment_intent_id",
            columns: ["refunded_amount", "refund_status", "refunds"],
            sql: refundUpdateSql(
              refund.payment_intent ?? row.payment_intent_id ?? "",
              {
                refunded_amount: next.refunded_amount,
                refund_status: next.refund_status,
                refunds,
              }
            ),
            note: `${event.name} — per-refund status tracked; aggregate re-derived`,
          },
        ],
      }
    }
  }
}

// --- Return page: what /checkout/success should show for the current state ---

export type ReturnView = { heading: string; message: string; cta: string }

export function returnPageView(row: OrderRow | null): ReturnView {
  if (!row) {
    return {
      heading: "Order not found",
      message:
        "We couldn't find an order for that session. Check your email for a confirmation, or try again.",
      cta: "← Back to cart",
    }
  }
  const { session_status, payment_status, refund_status } = row

  if (session_status !== "complete") {
    if (session_status === "expired") {
      return {
        heading: "Checkout session expired",
        message:
          "The checkout session expired before payment was completed. Build the cart again and try once more.",
        cta: "← Back to cart",
      }
    }
    return {
      heading: "Payment not completed",
      message: `Session status is “${session_status}” (payment status: ${payment_status}). The payment did not finish — go back and try again.`,
      cta: "← Back to cart",
    }
  }

  switch (payment_status) {
    case "paid":
      if (refund_status === "refunded" || refund_status === "partial") {
        return {
          heading: "Order refunded",
          message: `This order was refunded (${
            refund_status === "refunded" ? "in full" : "partially"
          }). Check the Stripe Dashboard or your email for details.`,
          cta: "← Back to the club site",
        }
      }
      return {
        heading: "Thank you — order confirmed",
        message:
          "Your payment went through. A confirmation is on its way to your email.",
        cta: "← Back to the club site",
      }
    case "processing":
      // Today's page shows "order confirmed" here — wrong for delayed methods.
      return {
        heading: "Payment received — confirming",
        message:
          "Your payment is processing and will confirm shortly (bank transfers take 1–3 business days). You'll get an email when it lands.",
        cta: "← Back to the club site",
      }
    case "no_payment_required":
      return {
        heading: "Thank you — order confirmed",
        message: "No payment was required for this order.",
        cta: "← Back to the club site",
      }
    case "unpaid":
      return {
        heading: "Payment failed",
        message: "The delayed payment failed after checkout. Please try again.",
        cta: "← Back to cart",
      }
    default:
      return {
        heading: "Payment not completed",
        message: `Session status is “${session_status}” (payment status: ${payment_status}).`,
        cta: "← Back to cart",
      }
  }
}
