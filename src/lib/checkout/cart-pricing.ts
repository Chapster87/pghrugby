/**
 * Price and availability for the cart's priced lines — the pure half of the
 * Checkout Session build.
 *
 * Kept free of `server-only` (and of any DatoCMS/Stripe client), like
 * `order-rows.ts`, so the routes and the scripted round-trips share one
 * implementation: given the cart's entries and the sku → DatoCMS `product`
 * records the CDA read resolves, these functions derive every quoted line and
 * every refusal. The DatoCMS read itself lives in `product-records.ts`.
 *
 * Authority: `docs/agents/pdp-pricing-and-sale-windows.md` (the sale window and
 * `effectivePriceId`), `docs/agents/pdp-product-model.md` § 3 (availability is
 * enforced at cart build and at session build) and
 * `docs/pdp-to-minicart-to-checkout-spec.md` § 8.1–8.2.
 */

import { pricedLines, type CartEntry } from "./cart-entries"
import { findCatalogItem } from "./catalog"

/** The commerce fields the cart build reads off a DatoCMS `product` record. */
export type ProductPriceRecord = {
  sku: string
  /**
   * Whether the product is buyable. Enforced, not editorial — a sold-out line
   * is refused with a per-line error and never silently dropped.
   */
  inStock: boolean
  /** The regular Stripe Price id — DatoCMS is now the price authority. */
  priceId: string | null
  /** The sale / early-bird Stripe Price id, chosen only inside its window. */
  salePriceId: string | null
  /** Sale window start (ISO datetime), inclusive. */
  saleStartsAt: string | null
  /** Sale window end (ISO datetime), inclusive. */
  saleEndsAt: string | null
}

/**
 * True when `now` falls inside the product's sale window.
 *
 * The window is absolute and inclusive at both ends
 * (`docs/agents/pdp-pricing-and-sale-windows.md`). A missing or unparsable bound
 * is **not** read as open-ended: `effectivePriceId` follows the literal rule
 * `now ∈ [sale_starts_at, sale_ends_at]`, so a half-authored window can never
 * silently discount a line.
 *
 * @param record - The product's price record.
 * @param now - The instant to test the window against.
 * @returns Whether the sale price applies.
 */
export function isWithinSaleWindow(
  record: ProductPriceRecord,
  now: Date
): boolean {
  if (!record.saleStartsAt || !record.saleEndsAt) return false

  const starts = Date.parse(record.saleStartsAt)
  const ends = Date.parse(record.saleEndsAt)
  if (Number.isNaN(starts) || Number.isNaN(ends)) return false

  const at = now.getTime()
  return at >= starts && at <= ends
}

/**
 * The Stripe Price id a line bills at:
 * `now ∈ [sale_starts_at, sale_ends_at] && sale_price_id ? sale_price_id :
 * price_id`.
 *
 * Resolved **fresh** at cart build and again at session build, so a window that
 * closes while a cart sits open re-prices rather than charging the early-bird
 * rate.
 *
 * @param record - The product's price record.
 * @param now - The instant to resolve at; defaults to the current time.
 * @returns The effective Price id, or null when the product has no price.
 */
export function effectivePriceId(
  record: ProductPriceRecord,
  now: Date = new Date()
): string | null {
  if (record.salePriceId && isWithinSaleWindow(record, now)) {
    return record.salePriceId
  }
  return record.priceId
}

/** Why a priced line cannot be checked out. */
export type CartLineErrorCode =
  | "unknown-sku"
  | "unknown-product"
  | "sold-out"
  | "unpriced"

/**
 * A per-line refusal. The session is blocked whole, never line-by-line: the
 * buyer removes the offending line (the `entryId` is its remove target) and
 * retries, so the total can never silently differ from what was shown.
 */
export type CartLineError = {
  /** The cart entry that failed — the flyout's remove target. */
  entryId: string
  sku: string
  code: CartLineErrorCode
  message: string
}

/** One priced line, quoted — the shape Stripe line items are built from. */
export type QuotedLine = {
  /** The cart entry's id (its `PricedLine.id`). */
  entryId: string
  sku: string
  /** The catalog label — the product name test-mode `price_data` bills under. */
  label: string
  /**
   * The catalog `family`. Live mode reads it back off the real Product; test
   * mode's generated Product has none, so the build writes this one onto it
   * instead (`docs/agents/checkout-session-build.md` § 5).
   */
  family: string | null
  /** Catalog unit amount in minor units — test-mode `price_data` only. */
  unitAmount: number
  quantity: number
  /** The effective Stripe Price id — live mode's line-item price. */
  priceId: string | null
}

/** The cart's quoted lines plus every per-line refusal. */
export type CartQuote = {
  lines: QuotedLine[]
  errors: CartLineError[]
}

/**
 * Resolves the cart's priced lines against the catalog and their DatoCMS
 * product records, in cart order (the order the Stripe line items and the
 * `reg_N` metadata are built from).
 *
 * A line that cannot be quoted is **never** dropped: it contributes a
 * `CartLineError` and, when the product record exists, still appears in `lines`
 * so the buyer sees exactly what they built. Collector entries are not quoted —
 * they never become line items.
 *
 * @param entries - The cart's entries, in add order.
 * @param products - The resolved product records, keyed by sku.
 * @param options.now - The instant the sale windows are resolved at.
 * @param options.requirePriceId - Live mode: every line must name a Stripe
 *   Price (test mode bills inline `price_data` instead).
 * @returns The quoted lines and the per-line errors; one of them is always empty.
 */
export function quoteCart(
  entries: CartEntry[],
  products: Map<string, ProductPriceRecord>,
  options: { now?: Date; requirePriceId?: boolean } = {}
): CartQuote {
  const now = options.now ?? new Date()
  const lines: QuotedLine[] = []
  const errors: CartLineError[] = []

  for (const line of pricedLines(entries)) {
    const catalogItem = findCatalogItem(line.sku)
    if (!catalogItem) {
      errors.push({
        entryId: line.id,
        sku: line.sku,
        code: "unknown-sku",
        message: `“${line.sku}” is not in the checkout catalog.`,
      })
      continue
    }

    const record = products.get(line.sku)
    if (!record) {
      errors.push({
        entryId: line.id,
        sku: line.sku,
        code: "unknown-product",
        message: `“${catalogItem.label}” has no product record in the CMS.`,
      })
      continue
    }

    const priceId = effectivePriceId(record, now)

    if (!record.inStock) {
      errors.push({
        entryId: line.id,
        sku: line.sku,
        code: "sold-out",
        message: `“${catalogItem.label}” is sold out — remove it from the cart to continue.`,
      })
    }
    if (options.requirePriceId && !priceId) {
      errors.push({
        entryId: line.id,
        sku: line.sku,
        code: "unpriced",
        message: `“${catalogItem.label}” has no Stripe Price configured — set its price in the CMS.`,
      })
    }

    lines.push({
      entryId: line.id,
      sku: line.sku,
      label: catalogItem.label,
      family: catalogItem.family ?? null,
      unitAmount: catalogItem.unitAmount,
      quantity: line.quantity,
      priceId,
    })
  }

  return { lines, errors }
}
