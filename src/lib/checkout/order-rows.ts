/**
 * Pure builders for the durable order record: the `orders` header plus its
 * `order_lines` and `order_registrations` child rows.
 *
 * Kept free of `server-only` (and of any Supabase/Stripe *client*) so the
 * write path in `record-order.ts` and the round-trip script share one
 * implementation: given a retrieved Checkout Session and the cart's entry list,
 * these functions derive every row deterministically.
 *
 * Shapes and the idempotency contract are fixed by
 * `docs/agents/order-records-and-reporting.md` / `docs/pdp-to-minicart-to-checkout-spec.md`
 * § 9: 0-based `line_index` over priced lines is the join key shared with the
 * `reg_N` metadata scheme, and ids are `${session_id}:${line_index}` so a
 * re-run is a no-op (`insert … on conflict do nothing`).
 */

import type Stripe from "stripe"

import { isCollectorEntry, pricedLines, type CartEntry } from "./cart-entries"

export type RefundStatus = "none" | "partial" | "refunded"

/** The `orders` header — identity, amounts, statuses, customer, families. */
export type OrderRecord = {
  session_id: string
  client_reference_id: string | null
  currency: string
  amount_total: number
  amount_tax: number | null
  payment_intent_id: string | null
  refunded_amount: number
  refund_status: RefundStatus
  payment_status: string | null
  session_status: string | null
  customer_email: string | null
  customer_name: string | null
  /** Distinct Stripe families the order touched; `[]` when none known. */
  families: string[]
  shipping: unknown
  created_at: string
  updated_at: string
}

/** One `order_lines` row — one Stripe line item, priced by Stripe. */
export type OrderLine = {
  /** `${session_id}:${line_index}` (deterministic). */
  id: string
  session_id: string
  line_index: number
  sku: string | null
  description: string | null
  quantity: number
  unit_amount: number | null
  amount_total: number
  family: string | null
  source_pdp: string | null
  parent_line_id: string | null
}

/** One `order_registrations` row — one collector entry, tied to its primary line. */
export type OrderRegistration = {
  /** `${session_id}:${line_index}` of its primary line. */
  id: string
  session_id: string
  line_id: string
  collector_ref: string | null
  fields: unknown
  answers: unknown
  summary: string | null
  source_pdp: string | null
}

export type OrderRows = {
  header: OrderRecord
  lines: OrderLine[]
  registrations: OrderRegistration[]
}

/** The deterministic line id shared by `order_lines.id` and `reg_N`. */
export function orderLineId(sessionId: string, lineIndex: number): string {
  return `${sessionId}:${lineIndex}`
}

/**
 * The line item's product: a string id unless the session was retrieved with
 * `price.product` expanded.
 */
function lineProduct(item: Stripe.LineItem) {
  const product = item.price?.product
  if (typeof product === "string") return product
  return product ?? null
}

/** The Stripe product id of a line item. */
function lineSku(item: Stripe.LineItem): string | null {
  const product = lineProduct(item)
  if (typeof product === "string") return product
  return product?.id ?? null
}

/**
 * The line item's product `family` metadata, or null when the product carries
 * none (the four one-off fundraisers) or was not expanded.
 */
function lineFamily(item: Stripe.LineItem): string | null {
  const product = lineProduct(item)
  if (product && typeof product === "object" && "metadata" in product) {
    const family = product.metadata?.family
    return typeof family === "string" && family.length > 0 ? family : null
  }
  return null
}

/**
 * Distinct families across **every** line item, in first-seen order — replaces
 * the old `deriveFlow` (the first line item's family, one value), so a cart
 * spanning products and the standalone donation classify identically. `[]`
 * means no line item carried a family.
 */
export function deriveFamilies(session: Stripe.Checkout.Session): string[] {
  const families: string[] = []
  for (const item of session.line_items?.data ?? []) {
    const family = lineFamily(item)
    if (family && !families.includes(family)) families.push(family)
  }
  return families
}

/**
 * Extracts the PaymentIntent id from a Checkout Session (string id, or object
 * when the session was retrieved with `expand: ["payment_intent"]`).
 */
function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  const paymentIntent = session.payment_intent
  if (!paymentIntent) return null
  return typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id
}

/**
 * Builds the `order_lines` rows: the session's line items, in Stripe order,
 * enriched positionally from the cart's priced lines with `source_pdp` and the
 * add-on's `parent_line_id`. A cartless order (no entries) gets nulls — it is
 * still fully described by the session.
 */
export function buildOrderLines(
  session: Stripe.Checkout.Session,
  entries: CartEntry[] | null
): OrderLine[] {
  const priced = pricedLines(entries)
  const lineItems = session.line_items?.data ?? []

  return lineItems.map((item, lineIndex) => {
    const entry = priced[lineIndex]
    const parentIndex = entry?.parentId
      ? priced.findIndex((candidate) => candidate.id === entry.parentId)
      : -1

    return {
      id: orderLineId(session.id, lineIndex),
      session_id: session.id,
      line_index: lineIndex,
      sku: lineSku(item),
      description: item.description ?? null,
      quantity: item.quantity ?? 1,
      unit_amount: item.price?.unit_amount ?? null,
      amount_total: item.amount_total ?? 0,
      family: lineFamily(item),
      source_pdp: entry?.sourcePdp ?? null,
      parent_line_id:
        parentIndex >= 0 ? orderLineId(session.id, parentIndex) : null,
    }
  })
}

/**
 * Builds the `order_registrations` rows: one per collector entry, linked to the
 * primary line its `parentId` points at. Its `summary` is the compact human
 * string the session carries in `metadata.reg_N` (written at session build) —
 * the untruncated payload lives here in `answers` / `fields`. A collector entry
 * whose primary is not in this session is skipped: it cannot be linked.
 */
export function buildOrderRegistrations(
  session: Stripe.Checkout.Session,
  entries: CartEntry[] | null
): OrderRegistration[] {
  const priced = pricedLines(entries)
  const metadata = session.metadata ?? {}
  const registrations: OrderRegistration[] = []

  for (const entry of (entries ?? []).filter(isCollectorEntry)) {
    const primaryIndex = priced.findIndex((line) => line.id === entry.parentId)
    if (primaryIndex < 0) continue

    const lineId = orderLineId(session.id, primaryIndex)
    registrations.push({
      id: lineId,
      session_id: session.id,
      line_id: lineId,
      collector_ref: entry.collectorRef,
      fields: entry.fields,
      answers: entry.answers,
      summary: metadata[`reg_${primaryIndex}`] ?? null,
      source_pdp: entry.sourcePdp,
    })
  }

  return registrations
}

/**
 * Builds the full durable record for a Checkout Session: the header plus both
 * child row sets. Amounts and descriptions come from the session (Stripe is the
 * price authority); the entry list supplies only provenance and registrations.
 */
export function buildOrderRows(
  session: Stripe.Checkout.Session,
  entries: CartEntry[] | null
): OrderRows {
  const now = new Date().toISOString()

  return {
    header: {
      session_id: session.id,
      client_reference_id: session.client_reference_id ?? null,
      currency: session.currency ?? "usd",
      amount_total: session.amount_total ?? 0,
      amount_tax: session.total_details?.amount_tax ?? null,
      payment_intent_id: paymentIntentId(session),
      refunded_amount: 0,
      refund_status: "none",
      payment_status: session.payment_status ?? null,
      session_status: session.status ?? null,
      customer_email: session.customer_details?.email ?? null,
      customer_name: session.customer_details?.name ?? null,
      families: deriveFamilies(session),
      shipping: session.collected_information?.shipping_details ?? null,
      created_at: now,
      updated_at: now,
    },
    lines: buildOrderLines(session, entries),
    registrations: buildOrderRegistrations(session, entries),
  }
}

/**
 * Splits the line rows for insertion: primaries first, then add-ons, so the
 * `parent_line_id` self-reference always resolves.
 */
export function splitForInsert(lines: OrderLine[]): {
  primaries: OrderLine[]
  addons: OrderLine[]
} {
  const primaries: OrderLine[] = []
  const addons: OrderLine[] = []
  for (const line of lines) {
    if (line.parent_line_id) addons.push(line)
    else primaries.push(line)
  }
  return { primaries, addons }
}

/** One table's rows, ready to insert as a batch. */
export type OrderInsertBatch = {
  table: "orders" | "order_lines" | "order_registrations"
  rows: Record<string, unknown>[]
}

/**
 * The insert plan for a record's rows, in the order the schema's constraints
 * require: the header, then primaries before add-ons (so the `parent_line_id`
 * self-reference resolves), then the registrations that reference those lines.
 * The write path and the round-trip script both walk this, so the ordering
 * contract lives in one place.
 */
export function orderInsertPlan(rows: OrderRows): OrderInsertBatch[] {
  const { primaries, addons } = splitForInsert(rows.lines)
  const plan: OrderInsertBatch[] = [{ table: "orders", rows: [rows.header] }]
  if (primaries.length > 0) plan.push({ table: "order_lines", rows: primaries })
  if (addons.length > 0) plan.push({ table: "order_lines", rows: addons })
  if (rows.registrations.length > 0) {
    plan.push({ table: "order_registrations", rows: rows.registrations })
  }
  return plan
}
