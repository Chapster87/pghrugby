import "server-only"

import { randomUUID } from "node:crypto"

import {
  PROTOTYPE_CATALOG,
  PROTOTYPE_CURRENCY,
  PROTOTYPE_MAX_GOLFERS,
} from "./catalog"
import { stripe } from "./stripe"

/**
 * PROTOTYPE — in-memory scratch store. Wipes on dev-server restart / hot
 * reload. Real persistence is the Supabase `orders` table (a later ticket);
 * the spike only demonstrates the flow and the shape of what gets recorded.
 * No persistence is intentional — see the prototype skill rules.
 */

export type PrototypeFlow = "dues-donation" | "golf"

export type PrototypeCartItem = {
  label: string
  unitAmount: number
  quantity: number
}

export type PrototypeCart = {
  cartRef: string
  flow: PrototypeFlow
  currency: string
  items: PrototypeCartItem[]
  total: number
  /** Per-golfer form payload (registration case). Not sent to Stripe. */
  golfers?: { name: string; email: string }[]
}

export type PrototypeOrder = {
  sessionId: string
  /** Session `status`: "open" | "complete" | "expired" | "abandoned". */
  sessionStatus: string | null
  cartRef: string | null
  flow: PrototypeFlow | null
  currency: string
  amountTotal: number
  paymentStatus: string | null
  customerEmail: string | null
  lineItems: { description: string; quantity: number; amountTotal: number }[]
  /** Registration payload joined back from the cart via client_reference_id. */
  registration: { name: string; email: string }[] | null
  recordedAt: string
}

const carts = new Map<string, PrototypeCart>()
const orders = new Map<string, PrototypeOrder>()

/** Creates a cart from client selections, validating against the catalog. */
export function createCart(input: {
  flow: PrototypeFlow
  quantity?: number
  donationIndex?: number
  golfers?: { name: string; email: string }[]
}): PrototypeCart {
  const cartRef = `proto-${input.flow}-${randomUUID().slice(0, 8)}`

  let items: PrototypeCartItem[] = []
  let golfers: PrototypeCart["golfers"]

  if (input.flow === "dues-donation") {
    items.push({
      label: PROTOTYPE_CATALOG.dues.label,
      unitAmount: PROTOTYPE_CATALOG.dues.unitAmount,
      quantity: 1,
    })

    // Optional fixed-amount donation preset. Index is validated by the caller
    // against the catalog; undefined means "no donation".
    if (typeof input.donationIndex === "number") {
      const preset = PROTOTYPE_CATALOG.donationPresets[input.donationIndex]
      if (preset) {
        items.push({
          label: preset.label,
          unitAmount: preset.unitAmount,
          quantity: 1,
        })
      }
    }
  } else if (input.flow === "golf") {
    const quantity = Math.min(
      Math.max(1, input.quantity ?? 1),
      PROTOTYPE_MAX_GOLFERS
    )
    items.push({
      label: PROTOTYPE_CATALOG.golf.label,
      unitAmount: PROTOTYPE_CATALOG.golf.unitAmount,
      quantity,
    })
    golfers = input.golfers
  }

  const total = items.reduce(
    (sum, item) => sum + item.unitAmount * item.quantity,
    0
  )

  const cart: PrototypeCart = {
    cartRef,
    flow: input.flow,
    currency: PROTOTYPE_CURRENCY,
    items,
    total,
    golfers,
  }

  carts.set(cartRef, cart)
  return cart
}

export function getCart(cartRef: string): PrototypeCart | undefined {
  return carts.get(cartRef)
}

export function listCarts(): PrototypeCart[] {
  return [...carts.values()]
}

export function getOrder(sessionId: string): PrototypeOrder | undefined {
  return orders.get(sessionId)
}

export function listOrders(): PrototypeOrder[] {
  return [...orders.values()]
}

/**
 * The shared "record an order" path. Called by the webhook (authoritative)
 * and by the return page as a fast path (the customer may never reach it, so
 * the webhook stays mandatory). Idempotent: keyed by session id.
 *
 * Fulfillment gate is `payment_status`, not `status` — a session can be
 * `complete` while payment is still processing.
 */
export async function recordOrder(sessionId: string): Promise<PrototypeOrder> {
  const existing = orders.get(sessionId)
  if (existing) {
    return existing
  }

  if (!stripe) {
    throw new Error("STRIPE_SECRET_KEY is not set")
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items"],
  })

  const lineItems =
    session.line_items?.data.map((item) => ({
      description: item.description ?? "unknown line item",
      quantity: item.quantity ?? 1,
      amountTotal: item.amount_total ?? 0,
    })) ?? []

  // Registration payload rides beside the session, never in metadata: the
  // session carries the reference (client_reference_id), and we re-join it
  // here. See the capabilities research §5/§6.
  const cart = session.client_reference_id
    ? carts.get(session.client_reference_id)
    : undefined

  const order: PrototypeOrder = {
    sessionId: session.id,
    sessionStatus: session.status ?? null,
    cartRef: session.client_reference_id,
    flow: cart?.flow ?? null,
    currency: session.currency ?? PROTOTYPE_CURRENCY,
    amountTotal: session.amount_total ?? 0,
    paymentStatus: session.payment_status ?? null,
    customerEmail: session.customer_details?.email ?? null,
    lineItems,
    registration: cart?.golfers ?? null,
    recordedAt: new Date().toISOString(),
  }

  orders.set(sessionId, order)
  return order
}
