import "server-only"

import { randomUUID } from "node:crypto"

import {
  isPricedLine,
  type CartEntry,
  type CollectorEntry,
  type PricedLine,
} from "./cart-entries"
import { CHECKOUT_CURRENCY, findCatalogItem } from "./catalog"
import { insertIgnoreDuplicates, selectRow } from "./supabase"

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
 * build; `total` is only the `/cart` display figure. The `items` field on the
 * returned cart is a derived, catalog-resolved view kept for the legacy
 * cart/session code — it is not part of the snapshot.
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

export type CheckoutSelection = {
  sku: string
  quantity: number
}

type CartRow = {
  cart_ref: string
  currency: string
  entries: CartEntry[]
  total: number
}

/** Resolves the snapshot's priced lines against the catalog for display/session building. */
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

/**
 * Builds a cart snapshot from client selections, validating every sku against
 * the catalog. Selections become priced lines; an optional form payload
 * becomes one collector entry linked to the first line.
 *
 * The flat one-shot form this bridges is replaced by the PDP's per-line entries
 * (`docs/agents/cart-line-model.md`); the synthesized collector entry therefore
 * carries only the answers, with no field-definition snapshot (`fields: []`).
 */
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
  const groupRef = `group-${randomUUID().slice(0, 12)}`
  const entries: CartEntry[] = []
  let primaryId: string | null = null

  for (const selection of input.selections) {
    const catalogItem = findCatalogItem(selection.sku)
    if (!catalogItem) {
      throw new Error(`"${selection.sku}" is not in the checkout catalog`)
    }
    const quantity = Math.min(
      Math.max(1, Math.floor(selection.quantity || 1)),
      MAX_LINE_QUANTITY
    )
    const id = `line-${randomUUID()}`
    primaryId ??= id
    const line: PricedLine = {
      id,
      kind: "product",
      sku: catalogItem.sku,
      quantity,
      sourcePdp: input.pdp,
      groupRef,
    }
    entries.push(line)
  }

  if (
    primaryId &&
    input.registration !== null &&
    input.registration !== undefined &&
    typeof input.registration === "object"
  ) {
    const collector: CollectorEntry = {
      id: `collector-${randomUUID()}`,
      kind: "collector",
      // The one-shot form captured answers only — no DatoCMS collector id.
      collectorRef: "",
      answers: input.registration as Record<string, unknown>,
      fields: [],
      sourcePdp: input.pdp,
      groupRef,
      parentId: primaryId,
    }
    entries.push(collector)
  }

  const items = resolveItems(entries)
  const total = items.reduce(
    (sum, item) => sum + item.unitAmount * item.quantity,
    0
  )

  return {
    cartRef,
    currency: CHECKOUT_CURRENCY,
    entries,
    total,
    items,
  }
}

/** Persists a computed cart snapshot. */
export async function saveCart(cart: CheckoutCart): Promise<void> {
  await insertIgnoreDuplicates("carts", {
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

/** Validates + builds + persists a cart in one step (the POST /api/checkout/cart path). */
export async function createCart(
  input: Parameters<typeof buildCart>[0]
): Promise<CheckoutCart> {
  const cart = buildCart(input)
  await saveCart(cart)
  return cart
}
