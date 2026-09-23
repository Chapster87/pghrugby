import "server-only"

import Stripe from "stripe"

import type { CartEntry } from "./cart-entries"
import {
  buildOrderRows,
  orderInsertPlan,
  type OrderLine,
  type OrderRecord,
  type OrderRegistration,
  type RefundStatus,
} from "./order-rows"
import { getCart } from "./cart-store"
import { stripe } from "./stripe"
import {
  insertIgnoreDuplicates,
  selectRow,
  selectRows,
  updateRow,
} from "./supabase"

export type {
  OrderLine,
  OrderRecord,
  OrderRegistration,
  RefundStatus,
} from "./order-rows"

/**
 * The shared "record an order" path — called by the webhook (authoritative)
 * and by the success page (fast path).
 *
 * `orders` is a header; the priced lines and their registrations are queryable
 * child rows (`order_lines` / `order_registrations`). The write is idempotent:
 * first writer wins on deterministic ids (`${session_id}:${line_index}`) via
 * `insert ... on conflict do nothing`, which is what the webhook + success-page
 * race depends on.
 *
 * The rows are identical whichever path lands first — both retrieve the same
 * Checkout Session — except `cs_async`-style cases (payment still processing),
 * where first-writer-wins locks in the `processing` state. Later events
 * (async payments, refunds) transition only the mutable status columns via
 * targeted DO UPDATEs (see updateOrderPaymentStatus / applyChargeRefund).
 */

/**
 * Aggregate refund status from a Stripe Charge (charge.refunded fires for
 * partial AND full refunds): the charge's `refunded` flag is true only when
 * the charge is fully refunded.
 */
export function deriveRefundStatus(charge: Stripe.Charge): RefundStatus {
  if (charge.refunded) return "refunded"
  if (charge.amount_refunded > 0) return "partial"
  return "none"
}

/** Retrieves the persisted order header for a session id (used by the success page). */
export async function getOrder(sessionId: string): Promise<OrderRecord | null> {
  return selectRow<OrderRecord>("orders", "session_id", sessionId)
}

/** The order's priced lines, in Stripe line-item order. */
export async function getOrderLines(sessionId: string): Promise<OrderLine[]> {
  return selectRows<OrderLine>(
    "order_lines",
    "session_id",
    sessionId,
    "line_index.asc"
  )
}

/** The order's registrations, one per collector entry. */
export async function getOrderRegistrations(
  sessionId: string
): Promise<OrderRegistration[]> {
  return selectRows<OrderRegistration>(
    "order_registrations",
    "session_id",
    sessionId
  )
}

/**
 * Records (or returns) the order for a Checkout Session. Throws if the
 * session can't be retrieved or Supabase is misconfigured; otherwise never
 * fails twice for the same session (first writer wins).
 *
 * The fast path (success page) passes `{ onlyWhenComplete: true }` so a
 * stale/expired session_id in the return URL can never create an order row;
 * the webhook records without the guard (checkout.session.completed is
 * complete by definition). Returns null when the guard rejects the session.
 */
export async function recordOrder(
  sessionId: string,
  options: { onlyWhenComplete?: boolean } = {}
): Promise<OrderRecord | null> {
  const existing = await getOrder(sessionId)
  if (existing) return existing

  if (!stripe) {
    throw new Error("STRIPE_SECRET_KEY is not set")
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items.data.price.product", "payment_intent"],
  })

  if (options.onlyWhenComplete && session.status !== "complete") {
    return null
  }

  // The entry list rides beside the session, never in metadata: the session
  // carries the reference (client_reference_id) and we re-join it here for the
  // per-line provenance and the registrations.
  const cart = session.client_reference_id
    ? await getCart(session.client_reference_id)
    : null
  const entries: CartEntry[] | null = cart?.entries ?? null

  const rows = buildOrderRows(session, entries)

  // The header, then primaries before add-ons (so `parent_line_id` resolves),
  // then the registrations that reference those lines. Each insert is
  // first-writer-wins, so a re-run is a no-op.
  for (const batch of orderInsertPlan(rows)) {
    await insertIgnoreDuplicates(batch.table, batch.rows)
  }

  return (await getOrder(sessionId)) ?? rows.header
}

/**
 * Targeted status transition for the async-payment events
 * (checkout.session.async_payment_succeeded / _failed): DO UPDATE
 * `payment_status` only — the identity/amount columns stay frozen at first
 * write. Returns the updated row, or null when no row exists yet (the
 * completed event should have landed first; callers fall back to recordOrder).
 */
export async function updateOrderPaymentStatus(
  sessionId: string,
  paymentStatus: string
): Promise<OrderRecord | null> {
  return updateRow<OrderRecord>("orders", "session_id", sessionId, {
    payment_status: paymentStatus,
    updated_at: new Date().toISOString(),
  })
}

/**
 * Aggregate refund transition for charge.refunded: DO UPDATE
 * `refunded_amount` + `refund_status` from the charge (`amount_refunded`,
 * `refunded`), reconciled by `payment_intent_id`. Aggregate only — no
 * per-refund JSONB, no `refund.*` subscriptions. Returns true when a row was
 * updated; false when no order row carries that PaymentIntent (the caller
 * must alert — there is no PaymentIntent → Checkout Session reverse link to
 * recover from).
 */
export async function applyChargeRefund(
  charge: Stripe.Charge
): Promise<boolean> {
  const paymentIntent = charge.payment_intent
  const paymentIntentId =
    typeof paymentIntent === "string"
      ? paymentIntent
      : paymentIntent?.id ?? null
  if (!paymentIntentId) return false

  const updated = await updateRow<OrderRecord>(
    "orders",
    "payment_intent_id",
    paymentIntentId,
    {
      refunded_amount: charge.amount_refunded,
      refund_status: deriveRefundStatus(charge),
      updated_at: new Date().toISOString(),
    }
  )
  return updated !== null
}
