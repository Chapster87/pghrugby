import "server-only"

import { isPricedLine, parseCartEntries, type CartEntry } from "./cart-entries"
import { clampLineQuantity } from "./cart-mutations"
import { CHECKOUT_CURRENCY, findCatalogItem } from "./catalog"
import { selectRow, upsertRow } from "./supabase"

/**
 * Server-authoritative cart store, backed by the Supabase `carts` table.
 *
 * A cart persists a single `entries` snapshot — the flat, ordered
 * `PricedLine` / `CollectorEntry` list (see `cart-entries.ts`) — so the
 * checkout-session route can replay it and `recordOrder` can rebuild the
 * per-line provenance and registration rows. `flow` / cart-level `registration`
 * are gone: each entry carries its own `sourcePdp`, and answers live on a
 * collector entry.
 *
 * **No resolved amounts are persisted.** Prices are re-resolved at session
 * build; `total` is only a display figure. The `items` field on the returned
 * cart is a derived, catalog-resolved view the session build walks — it is not
 * part of the snapshot.
 */

export type CheckoutCartItem = {
  sku: string
  label: string
  /** Minor units (cents). */
  unitAmount: number
  quantity: number
}

export type CheckoutCart = {
  cartRef: string
  currency: string
  /** The flat, browser-held entry list, replayed verbatim at session build. */
  entries: CartEntry[]
  /** Minor units (cents) — server-computed display snapshot, not price authority. */
  total: number
  /**
   * The priced lines resolved against the catalog — a display/session view
   * derived from `entries`, never persisted on the snapshot.
   */
  items: CheckoutCartItem[]
}

type CartRow = {
  cart_ref: string
  currency: string
  entries: CartEntry[]
  total: number
}

/** Resolves the snapshot's priced lines against the catalog for session building. */
function resolveItems(entries: CartEntry[]): CheckoutCartItem[] {
  const items: CheckoutCartItem[] = []
  for (const entry of entries) {
    if (!isPricedLine(entry)) continue
    const catalogItem = findCatalogItem(entry.sku)
    if (!catalogItem) continue
    items.push({
      sku: entry.sku,
      label: catalogItem.label,
      unitAmount: catalogItem.unitAmount,
      quantity: entry.quantity,
    })
  }
  return items
}

/** The snapshot's catalog-resolved total, in minor units. */
function totalOf(items: CheckoutCartItem[]): number {
  return items.reduce((sum, item) => sum + item.unitAmount * item.quantity, 0)
}

/**
 * Builds the checkout snapshot from the **browser-held** cart.
 *
 * The client owns the entry list and the `cartRef`; the server validates both
 * and the result is written to the `carts` row, which is the snapshot only —
 * `recordOrder` re-joins it by `client_reference_id` to rebuild the order's
 * provenance and registrations.
 *
 * An unknown sku is a hard error, not a dropped line: silently dropping one
 * would charge the buyer for a cart they did not build. Quantities are clamped
 * for the same reason — the client is not the price or quantity authority.
 *
 * @param input.cartRef - The client's `client_reference_id` uuid.
 * @param input.entries - The untrusted entry list, parsed at this boundary.
 * @returns The validated snapshot, ready to persist.
 */
export function buildCartFromEntries(input: {
  cartRef: string
  entries: unknown
}): CheckoutCart {
  if (!input.cartRef) {
    throw new Error("cartRef is required")
  }

  const parsed = parseCartEntries(input.entries)
  if (!parsed.some(isPricedLine)) {
    throw new Error("the cart holds no priced lines")
  }

  const entries: CartEntry[] = parsed.map((entry) => {
    if (!isPricedLine(entry)) return entry
    const catalogItem = findCatalogItem(entry.sku)
    if (!catalogItem) {
      throw new Error(`"${entry.sku}" is not in the checkout catalog`)
    }
    return {
      ...entry,
      sku: catalogItem.sku,
      quantity: clampLineQuantity(entry.quantity),
    }
  }) as CartEntry[]

  const items = resolveItems(entries)

  return {
    cartRef: input.cartRef,
    currency: CHECKOUT_CURRENCY,
    entries,
    total: totalOf(items),
    items,
  }
}

/** Persists a computed cart snapshot. */
export async function saveCart(cart: CheckoutCart): Promise<void> {
  // Upsert, not insert-ignore: the snapshot is ephemeral and must track the
  // browser cart's latest state, so a second checkout on the same `cartRef`
  // (after an edit) replaces the row. Orders are the opposite — first writer
  // wins there.
  await upsertRow("carts", {
    cart_ref: cart.cartRef,
    currency: cart.currency,
    entries: cart.entries,
    total: cart.total,
  } satisfies CartRow)
}

/** Loads a persisted cart by cartRef (the client_reference_id). */
export async function getCart(cartRef: string): Promise<CheckoutCart | null> {
  const row = await selectRow<CartRow>("carts", "cart_ref", cartRef)
  if (!row) return null
  return {
    cartRef: row.cart_ref,
    currency: row.currency,
    entries: row.entries,
    total: row.total,
    items: resolveItems(row.entries),
  }
}

/**
 * Validates + snapshots the browser-held cart in one step — the checkout
 * handoff (`POST /api/checkout/cart`).
 */
export async function createCartFromEntries(input: {
  cartRef: string
  entries: unknown
}): Promise<CheckoutCart> {
  const cart = buildCartFromEntries(input)
  await saveCart(cart)
  return cart
}
