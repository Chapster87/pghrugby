import "server-only"

import { isPricedLine, parseCartEntries, type CartEntry } from "./cart-entries"
import { clampLineQuantity } from "./cart-mutations"
import { quoteCart, type CartLineError, type QuotedLine } from "./cart-pricing"
import { CHECKOUT_CURRENCY } from "./catalog"
import { resolveProductRecords } from "./product-records"
import { isLiveStripe } from "./stripe"
import { selectRow, upsertRow } from "./supabase"

/**
 * The checkout cart: parsing and validating the browser-held entries, resolving
 * them against DatoCMS, and persisting the snapshot the session build hands to
 * `recordOrder`.
 *
 * Two halves, deliberately separate:
 *
 * - `buildCartFromEntries` is the **pure boundary** — it parses the untrusted
 *   entry list (a `localStorage` round trip, a POST body) and throws when the
 *   cart is structurally unusable. Skus and quantities are not judged here.
 * - `resolveCartFromEntries` is the **content half** — one cache-tagged CDA read
 *   supplies availability and the price ids, and a line that cannot be checked
 *   out comes back as a per-line error rather than an exception, so a mixed cart
 *   with one sold-out division still quotes its valid lines.
 *
 * The snapshot (`entries`, `currency`, `total`) is written **at session build**,
 * not at add or validate time (`docs/pdp-to-minicart-to-checkout-spec.md` §
 * 8.1): it is the checkout-time truth, and `recordOrder` re-joins it by
 * `client_reference_id`. **No resolved amounts are persisted** — prices are
 * re-resolved on every build; `total` is only the display figure.
 */

/** A cart that has passed the structural boundary, before it is quoted. */
export type ValidatedCart = {
  cartRef: string
  currency: string
  /** The flat, browser-held entry list, in add order. */
  entries: CartEntry[]
}

/** The persisted `carts` snapshot. */
export type CheckoutCart = ValidatedCart & {
  /** Minor units (cents) — server-computed display snapshot, not price authority. */
  total: number
}

/** A cart validated and quoted: the snapshot plus its price/availability read. */
export type ResolvedCart = CheckoutCart & {
  /** The priced lines in cart order — the Stripe line items. */
  lines: QuotedLine[]
  /** Per-line refusals; the session is blocked whole when any is present. */
  errors: CartLineError[]
}

type CartRow = {
  cart_ref: string
  currency: string
  entries: CartEntry[]
  total: number
}

/**
 * Parses and validates the browser-held entry list, throwing when the cart is
 * structurally unusable (no `cartRef`, no priced line at all, unparsable body).
 *
 * Quantities are clamped here rather than trusted: the client is not the
 * quantity authority (`MAX_LINE_QUANTITY`). Skus are **not** checked — an
 * unknown or sold-out sku is a per-line error from `resolveCartFromEntries`, so
 * the buyer is told which line to remove instead of being handed a whole-cart
 * failure.
 *
 * @param input.cartRef - The client's `client_reference_id`.
 * @param input.entries - The untrusted entry list.
 * @returns The parsed entries with the cart's fixed attributes.
 */
export function buildCartFromEntries(input: {
  cartRef: string
  entries: unknown
}): ValidatedCart {
  if (!input.cartRef) {
    throw new Error("cartRef is required")
  }

  const parsed = parseCartEntries(input.entries)
  if (!parsed.some(isPricedLine)) {
    throw new Error("the cart holds no priced lines")
  }

  const entries = parsed.map((entry) =>
    isPricedLine(entry)
      ? { ...entry, quantity: clampLineQuantity(entry.quantity) }
      : entry
  )

  return { cartRef: input.cartRef, currency: CHECKOUT_CURRENCY, entries }
}

/**
 * Validates the browser-held cart and resolves it against DatoCMS: one CDA read
 * for every sku, then the sale-window/availability quote.
 *
 * Called by the add-time validate route (`POST /api/checkout/cart`) and again by
 * the session build, which re-resolves **fresh** so a window that closed while
 * the cart sat open re-prices, and a line that sold out in between is refused.
 *
 * @param input.cartRef - The client's `client_reference_id`.
 * @param input.entries - The untrusted entry list.
 * @returns The quoted lines, the per-line errors, and the display total.
 * @throws When the cart is structurally unusable (see `buildCartFromEntries`).
 */
export async function resolveCartFromEntries(input: {
  cartRef: string
  entries: unknown
}): Promise<ResolvedCart> {
  const cart = buildCartFromEntries(input)

  const records = await resolveProductRecords(
    cart.entries.filter(isPricedLine).map((line) => line.sku)
  )
  const { lines, errors } = quoteCart(cart.entries, records, {
    requirePriceId: isLiveStripe,
  })

  return {
    ...cart,
    lines,
    errors,
    total: lines.reduce(
      (sum, line) => sum + line.unitAmount * line.quantity,
      0
    ),
  }
}

/**
 * The refusal body both checkout routes answer a request with: the summary line
 * plus one entry per line the server will not bill.
 *
 * Shared so the buyer-facing wording cannot drift between the add-time validate
 * call and the session build, which refuse the same lines in the same way.
 *
 * @param errors - The per-line refusals to report.
 * @returns The `409` response body.
 */
export function refusalResponse(errors: CartLineError[]): {
  error: string
  errors: CartLineError[]
} {
  return {
    error: "Some lines can't be checked out — remove them and try again.",
    errors,
  }
}

/**
 * Persists the cart snapshot.
 *
 * Upsert, not insert-ignore: the snapshot must track the browser cart's latest
 * state, so a second checkout on the same `cartRef` (after an edit) replaces the
 * row. Orders are the opposite — first writer wins there.
 */
export async function saveCart(cart: CheckoutCart): Promise<void> {
  await upsertRow("carts", {
    cart_ref: cart.cartRef,
    currency: cart.currency,
    entries: cart.entries,
    total: cart.total,
  } satisfies CartRow)
}

/**
 * Loads the persisted snapshot by cartRef (the `client_reference_id`).
 *
 * Read by `recordOrder` in the webhook and on the return page, where the entry
 * list is the only source of per-line provenance and registrations. The amounts
 * are deliberately **not** re-derived here: `order_lines.unit_amount` comes from
 * the Stripe session.
 */
export async function getCart(cartRef: string): Promise<CheckoutCart | null> {
  const row = await selectRow<CartRow>("carts", "cart_ref", cartRef)
  if (!row) return null
  return {
    cartRef: row.cart_ref,
    currency: row.currency,
    entries: row.entries,
    total: row.total,
  }
}
