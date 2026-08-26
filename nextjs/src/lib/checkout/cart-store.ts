import "server-only"

import { randomUUID } from "node:crypto"

import {
  CHECKOUT_CATALOG,
  CHECKOUT_CURRENCY,
  CHECKOUT_MAX_GOLFERS,
} from "./catalog"
import { insertIgnoreDuplicates, selectRow } from "./supabase"

/**
 * Server-authoritative cart store, backed by the Supabase `carts` table.
 *
 * The client only sends selections; the server validates them against the
 * catalog and computes the line items and total. The cart is persisted so the
 * checkout-session route can replay it (even across server restarts) and the
 * webhook can re-join the registration payload via `client_reference_id`.
 */

export type CheckoutFlow = "dues" | "golf" | "tournament"

export type CheckoutCartItem = {
  sku: string
  label: string
  /** Minor units (cents). */
  unitAmount: number
  quantity: number
}

export type CheckoutCart = {
  cartRef: string
  flow: CheckoutFlow
  currency: string
  items: CheckoutCartItem[]
  /** Minor units (cents). */
  total: number
  /** Flow-specific form payload (golf: captain + golfers; tournament: team + division + contact). */
  registration?: unknown
}

type CartRow = {
  cart_ref: string
  flow: CheckoutFlow
  currency: string
  line_items: CheckoutCartItem[]
  total: number
  registration: unknown
}

/** Builds a cart from client selections, validating everything against the catalog. */
export function buildCart(input: {
  flow: CheckoutFlow
  quantity?: number
  donationPresetIndex?: number
  addons?: ("mulligan" | "drinkBand")[]
  golfers?: { name: string; email: string }[]
  captain?: { name: string; email: string }
  division?: string
  teamName?: string
  contact?: { name: string; email: string }
}): CheckoutCart {
  const cartRef = `cart-${input.flow}-${randomUUID().slice(0, 12)}`
  const items: CheckoutCartItem[] = []
  let registration: unknown

  if (input.flow === "dues") {
    items.push({
      sku: CHECKOUT_CATALOG.dues.sku,
      label: CHECKOUT_CATALOG.dues.label,
      unitAmount: CHECKOUT_CATALOG.dues.unitAmount,
      quantity: 1,
    })

    if (typeof input.donationPresetIndex === "number") {
      const preset = CHECKOUT_CATALOG.donationPresets[input.donationPresetIndex]
      if (preset) {
        items.push({
          sku: preset.sku,
          label: preset.label,
          unitAmount: preset.unitAmount,
          quantity: 1,
        })
      }
    }
  } else if (input.flow === "golf") {
    const quantity = Math.min(
      Math.max(1, input.quantity ?? 1),
      CHECKOUT_MAX_GOLFERS
    )
    items.push({
      sku: CHECKOUT_CATALOG.golf.registration.sku,
      label: CHECKOUT_CATALOG.golf.registration.label,
      unitAmount: CHECKOUT_CATALOG.golf.registration.unitAmount,
      quantity,
    })

    for (const addon of input.addons ?? []) {
      const item = CHECKOUT_CATALOG.golf[addon]
      items.push({ sku: item.sku, label: item.label, unitAmount: item.unitAmount, quantity: 1 })
    }

    // The per-golfer payload rides beside the session, never in Stripe
    // metadata — re-joined at record time via client_reference_id.
    registration = {
      captain: input.captain ?? null,
      golfers: (input.golfers ?? []).slice(0, quantity),
    }
  } else if (input.flow === "tournament") {
    const division = CHECKOUT_CATALOG.tournament.divisions.find(
      (d) => d.sku === input.division
    )
    if (!division) {
      throw new Error("division is not a valid catalog tournament division")
    }

    items.push({
      sku: division.sku,
      label: division.label,
      unitAmount: division.unitAmount,
      quantity: 1,
    })

    registration = {
      division: division.sku,
      teamName: input.teamName ?? null,
      contact: input.contact ?? null,
    }
  }

  const total = items.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0)

  return { cartRef, flow: input.flow, currency: CHECKOUT_CURRENCY, items, total, registration }
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
