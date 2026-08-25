/**
 * PROTOTYPE — pure order-record logic for the website Supabase `orders` table.
 *
 * Answering wayfinder ticket #11 (Prototype: Orders and registrations table
 * schema): how should the canonical order record + optional registration
 * payload be shaped, and what does an idempotent webhook write path look like?
 *
 * This module is the portable bit: pure functions, no I/O, no terminal code.
 * The interactive shell (tui.ts) supplies the fake Stripe session payloads and
 * drives the cases by hand. If the shape survives, this lifts into the real
 * `recordOrder` in the checkout module replacement.
 */

export type Flow = "golf" | "tournament" | "dues" | "donation" | "membership"

export type LineItem = {
  description: string
  quantity: number
  /** Minor units (cents). */
  amountTotal: number
}

export type Order = {
  /** Stripe Checkout Session id (cs_...). Primary key in the DB. */
  sessionId: string
  /** cartRef; the reconciliation key that joins the registration payload back. */
  clientReferenceId: string | null
  /** Derived from the cart via client_reference_id; null when unknowable (Payment Link). */
  flow: Flow | null
  currency: string
  /** Minor units (cents). */
  amountTotal: number
  /** Minor units (cents); null if not recorded. */
  amountSubtotal: number | null
  /** Minor units (cents); populated once Stripe Tax is enabled. */
  amountTax: number | null
  /** Mirrors Stripe: paid | unpaid | no_payment_required | processing. */
  paymentStatus: string
  /** Mirrors Stripe: open | complete | expired | abandoned. */
  sessionStatus: string | null
  customerEmail: string | null
  customerName: string | null
  /** [{description, quantity, amountTotal}], from the session's expanded line items. */
  lineItems: LineItem[]
  /** Form payload for golf/tournament; rides beside the session, never in Stripe metadata. */
  registration: unknown | null
  /** Reserved; populated when shipping_address_collection lands. */
  shipping: unknown | null
  createdAt: string
  updatedAt: string
}

/** The subset of a Stripe Checkout Session the orders table records. */
export type SessionSnapshot = {
  id: string
  clientReferenceId: string | null
  currency: string
  amountTotal: number
  amountSubtotal: number | null
  amountTax: number | null
  paymentStatus: string
  status: string | null
  customerEmail: string | null
  customerName: string | null
  lineItems: LineItem[]
}

/** Registration payloads ride beside the session, joined via client_reference_id. */
export type CartPayload = {
  flow: Flow
  registration: unknown
}

export type OrderStore = Map<string, Order>

export type SessionLookup = (id: string) => SessionSnapshot | undefined
export type CartLookup = (cartRef: string) => CartPayload | undefined

export function buildOrder(
  session: SessionSnapshot,
  cart: CartPayload | null,
  now: string
): Order {
  return {
    sessionId: session.id,
    clientReferenceId: session.clientReferenceId,
    flow: cart?.flow ?? null,
    currency: session.currency,
    amountTotal: session.amountTotal,
    amountSubtotal: session.amountSubtotal,
    amountTax: session.amountTax,
    paymentStatus: session.paymentStatus,
    sessionStatus: session.status,
    customerEmail: session.customerEmail,
    customerName: session.customerName,
    lineItems: session.lineItems,
    registration: cart?.registration ?? null,
    shipping: null,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * The SQL this models:
 *
 *   insert into orders (...) values (...)
 *   on conflict (session_id) do nothing;
 *
 * First writer wins. A duplicate webhook delivery is a no-op, and the
 * return-page fast path racing the webhook returns the existing row either
 * way — the row is identical whichever path landed first (both retrieve the
 * same Checkout Session). First-writer-wins means a later event can never
 * regress a row; event-driven *updates* (async payments, refunds, expirations)
 * are the map's deferred edge-case work and would switch this to DO UPDATE.
 */
export function upsertOrder(
  store: OrderStore,
  order: Order
): { order: Order; inserted: boolean } {
  const existing = store.get(order.sessionId)
  if (existing) {
    return { order: existing, inserted: false }
  }
  store.set(order.sessionId, order)
  return { order, inserted: true }
}

/**
 * The shared "record an order" path — what the webhook (authoritative) and the
 * return page (fast path) both call, mirroring the spike's `recordOrder`.
 * `getSession`/`getCart` are injected so the module stays pure; production
 * supplies real Stripe/cart lookups, the TUI supplies its fake maps.
 */
export function recordOrder(
  store: OrderStore,
  getSession: SessionLookup,
  getCart: CartLookup,
  sessionId: string,
  now: () => string = () => new Date().toISOString()
): { order: Order; inserted: boolean } {
  const session = getSession(sessionId)
  if (!session) {
    throw new Error(`no session: ${sessionId}`)
  }
  const cart = session.clientReferenceId
    ? getCart(session.clientReferenceId)
    : undefined
  const order = buildOrder(session, cart ?? null, now())
  return upsertOrder(store, order)
}
