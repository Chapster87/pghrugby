import "server-only"

import Stripe from "stripe"

import { getCart } from "./cart-store"
import { stripe } from "./stripe"
import { insertIgnoreDuplicates, selectRow } from "./supabase"

/**
 * The shared "record an order" path — called by the webhook (authoritative)
 * and by the success page (fast path). Idempotent: first writer wins, keyed by
 * session id (`insert ... on conflict (session_id) do nothing`), matching the
 * locked write path from the orders-schema prototype.
 *
 * The row is identical whichever path lands first — both retrieve the same
 * Checkout Session — except `cs_async`-style cases (payment still processing),
 * where first-writer-wins locks in the `processing` state. Event-driven status
 * updates (async payments, refunds, expirations) are deferred edge-case work.
 */

export type OrderFlow =
  | "golf"
  | "tournament"
  | "dues"
  | "donation"
  | "membership"

export type OrderLineItem = {
  description: string
  quantity: number
  unit_amount: number | null
  amount_total: number
  /** Stripe product id (from the expanded price.product) — enables product-level reporting. */
  sku: string | null
}

export type OrderRecord = {
  session_id: string
  client_reference_id: string | null
  flow: OrderFlow | null
  currency: string
  amount_total: number
  amount_tax: number | null
  payment_status: string | null
  session_status: string | null
  customer_email: string | null
  customer_name: string | null
  line_items: OrderLineItem[]
  registration: unknown
  shipping: unknown
  created_at: string
  updated_at: string
}

/**
 * Flow derivation: cart-derived via client_reference_id; cartless sessions
 * (membership Payment Links, donation Buy Buttons) fall back to the first line
 * item's product `family` metadata.
 */
function deriveFlow(session: Stripe.Checkout.Session): OrderFlow | null {
  const first = session.line_items?.data[0]
  const product = first?.price?.product
  if (typeof product === "object" && product && "metadata" in product) {
    const family = product.metadata?.family
    if (
      family === "membership" ||
      family === "dues" ||
      family === "golf" ||
      family === "tournament" ||
      family === "donation"
    ) {
      return family
    }
  }
  return null
}

export function buildOrderRecord(
  session: Stripe.Checkout.Session,
  flow: OrderFlow | null,
  registration: unknown
): OrderRecord {
  const lineItems: OrderLineItem[] =
    session.line_items?.data.map((item) => {
      const product = item.price?.product
      const sku =
        typeof product === "object" && product
          ? product.id
          : typeof product === "string"
          ? product
          : null
      return {
        description: item.description ?? "unknown line item",
        quantity: item.quantity ?? 1,
        unit_amount: item.price?.unit_amount ?? null,
        amount_total: item.amount_total ?? 0,
        sku,
      }
    }) ?? []

  const now = new Date().toISOString()
  return {
    session_id: session.id,
    client_reference_id: session.client_reference_id,
    flow,
    currency: session.currency ?? "usd",
    amount_total: session.amount_total ?? 0,
    amount_tax: session.total_details?.amount_tax ?? null,
    payment_status: session.payment_status ?? null,
    session_status: session.status ?? null,
    customer_email: session.customer_details?.email ?? null,
    customer_name: session.customer_details?.name ?? null,
    line_items: lineItems,
    registration,
    shipping: session.collected_information?.shipping_details ?? null,
    created_at: now,
    updated_at: now,
  }
}

/** Retrieves the persisted order row for a session id (used by the success page). */
export async function getOrder(sessionId: string): Promise<OrderRecord | null> {
  return selectRow<OrderRecord>("orders", "session_id", sessionId)
}

/**
 * Records (or returns) the order for a Checkout Session. Throws if the
 * session can't be retrieved or Supabase is misconfigured; otherwise never
 * fails twice for the same session (first writer wins).
 */
export async function recordOrder(sessionId: string): Promise<OrderRecord> {
  const existing = await getOrder(sessionId)
  if (existing) return existing

  if (!stripe) {
    throw new Error("STRIPE_SECRET_KEY is not set")
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items.data.price.product"],
  })

  // Registration payload rides beside the session, never in metadata: the
  // session carries the reference (client_reference_id) and we re-join it here.
  const cart = session.client_reference_id
    ? await getCart(session.client_reference_id)
    : null

  // Cart-derived flow (dues | golf | tournament); cartless sessions fall back
  // to the first line item's product family metadata (membership Payment Links,
  // donation Buy Buttons).
  const flow: OrderFlow | null = cart
    ? (cart.flow as OrderFlow)
    : deriveFlow(session)

  const order = buildOrderRecord(session, flow, cart?.registration ?? null)

  await insertIgnoreDuplicates("orders", order)

  return (await getOrder(sessionId)) ?? order
}
