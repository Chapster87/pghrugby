import "server-only"

import { randomUUID } from "node:crypto"

import { CHECKOUT_CURRENCY, findCatalogItem } from "./catalog"
import { insertIgnoreDuplicates, selectRow } from "./supabase"

/**
 * Server-authoritative cart store, backed by the Supabase `carts` table.
 *
 * The client only sends selections (sku + quantity) plus an optional
 * registration payload; the server validates every sku against the catalog and
 * computes the line items and total. The cart is persisted so the
 * checkout-session route can replay it (even across server restarts) and the
 * webhook can re-join the registration payload via `client_reference_id`.
 *
 * `flow` is a reporting tag only (the PDP slug, e.g. "golf-outing") — it never
 * drives cart building. Order flow is derived from Stripe product family
 * metadata at record time (see recordOrder).
 */

/** Safety bound per line quantity; the real cap (e.g. max golfers) lives in the DataCollector form definition. */
const MAX_LINE_QUANTITY = 100

export type CheckoutCartItem = {
  sku: string
  label: string
  /** Minor units (cents). */
  unitAmount: number
  quantity: number
}

export type CheckoutCart = {
  cartRef: string
  /** PDP slug this cart was built on (reporting tag only). */
  flow: string
  currency: string
  items: CheckoutCartItem[]
  /** Minor units (cents). */
  total: number
  /** Form payload from the PDP's DataCollector (golf: captain + golfers; SC7s: team + contact). */
  registration?: unknown
}

export type CheckoutSelection = {
  sku: string
  quantity: number
}

type CartRow = {
  cart_ref: string
  flow: string
  currency: string
  line_items: CheckoutCartItem[]
  total: number
  registration: unknown
}

/** Builds a cart from client selections, validating every sku against the catalog. */
export function buildCart(input: {
  pdp: string
  selections: CheckoutSelection[]
  registration?: unknown
}): CheckoutCart {
  if (!input.pdp) {
    throw new Error("pdp is required")
  }
  if (!Array.isArray(input.selections) || input.selections.length === 0) {
    throw new Error("at least one selection is required")
  }

  const cartRef = `cart-${input.pdp}-${randomUUID().slice(0, 12)}`
  const items: CheckoutCartItem[] = []

  for (const selection of input.selections) {
    const catalogItem = findCatalogItem(selection.sku)
    if (!catalogItem) {
      throw new Error(`"${selection.sku}" is not in the checkout catalog`)
    }
    const quantity = Math.min(
      Math.max(1, Math.floor(selection.quantity || 1)),
      MAX_LINE_QUANTITY
    )
    items.push({
      sku: catalogItem.sku,
      label: catalogItem.label,
      unitAmount: catalogItem.unitAmount,
      quantity,
    })
  }

  const total = items.reduce(
    (sum, item) => sum + item.unitAmount * item.quantity,
    0
  )

  return {
    cartRef,
    flow: input.pdp,
    currency: CHECKOUT_CURRENCY,
    items,
    total,
    registration: input.registration,
  }
}

/** Persists a computed cart. */
export async function saveCart(cart: CheckoutCart): Promise<void> {
  await insertIgnoreDuplicates("carts", {
    cart_ref: cart.cartRef,
    flow: cart.flow,
    currency: cart.currency,
    line_items: cart.items,
    total: cart.total,
    registration: cart.registration ?? null,
  } satisfies CartRow)
}

/** Loads a persisted cart by cartRef (the client_reference_id). */
export async function getCart(cartRef: string): Promise<CheckoutCart | null> {
  const row = await selectRow<CartRow>("carts", "cart_ref", cartRef)
  if (!row) return null
  return {
    cartRef: row.cart_ref,
    flow: row.flow,
    currency: row.currency,
    items: row.line_items,
    total: row.total,
    registration: row.registration ?? undefined,
  }
}

/** Validates + builds + persists a cart in one step (the POST /api/checkout/cart path). */
export async function createCart(
  input: Parameters<typeof buildCart>[0]
): Promise<CheckoutCart> {
  const cart = buildCart(input)
  await saveCart(cart)
  return cart
}
