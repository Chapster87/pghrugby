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
import { findCatalogItem, type CatalogItem } from "./catalog"

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
 * Whether the product's sale Price is running at `now`.
 *
 * A bound the record leaves **empty does not limit the sale**: a set start means
 * "from then on", a set end means "until then", and a sale Price with no window at
 * all is simply on sale. Ending a sale is therefore an explicit act — set an end
 * date, or clear the sale Price — which is what makes linking a sale price do
 * what linking a sale price says. (Requiring both bounds instead meant a linked
 * sale Price silently did nothing, which is the trap this rule exists to avoid.)
 *
 * A bound that is *present but unreadable* is the one case that refuses to
 * discount: the value cannot be honoured, and guessing would charge a sale price
 * against a window nobody can see.
 *
 * @param record - The product's price record.
 * @param now - The instant to test against.
 * @returns Whether the sale Price applies.
 */
export function isSaleRunning(record: ProductPriceRecord, now: Date): boolean {
  if (!record.salePriceId) return false

  const starts = boundTime(record.saleStartsAt)
  const ends = boundTime(record.saleEndsAt)
  if (starts === undefined || ends === undefined) return false

  const at = now.getTime()
  if (starts !== null && at < starts) return false
  if (ends !== null && at > ends) return false
  return true
}

/**
 * Reads a window bound: `null` when empty (no limit), `undefined` when present
 * but unreadable.
 *
 * @param value - The bound as the CMS holds it.
 * @returns Milliseconds, or null/undefined per the above.
 */
function boundTime(value: string | null): number | null | undefined {
  if (value === null || value.trim() === "") return null
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

/**
 * The CMS's own price rule: the sale Price while the sale is running, otherwise
 * the regular price.
 *
 * Resolved **fresh** at cart build and again at session build, so a window that
 * closes while a cart sits open re-prices rather than charging the early-bird
 * rate. This is what the CMS alone says; `resolveLinePriceId` is what a line
 * actually bills at, since it adds the catalog's default underneath.
 *
 * @param record - The product's price record.
 * @param now - The instant to resolve at; defaults to the current time.
 * @returns The CMS's effective Price id, or null when the record names none.
 */
export function effectivePriceId(
  record: ProductPriceRecord,
  now: Date = new Date()
): string | null {
  if (record.salePriceId && isSaleRunning(record, now)) {
    return record.salePriceId
  }
  return record.priceId
}

/**
 * The Stripe Price a line bills at: the CMS's effective price, falling back to
 * the price provisioned in `catalog.ts` when the CMS field is blank.
 *
 * The CMS field is labelled **"Price ID (override)"**, and that is the rule:
 * content overrides the default. A blank field means "charge what we
 * provisioned", never "refuse the sale" — a missing price must not be able to
 * take checkout down, which is why the catalog keeps its live Price ids rather
 * than ceding them entirely to the CMS
 * (`docs/agents/checkout-session-build.md` § 4).
 *
 * @param record - The product's CMS record, or null when there is none (the
 *   caller refuses that line separately: a missing record has no availability).
 * @param catalogItem - The sku's catalog entry, whose `priceId` is the default.
 * @param now - The instant the sale window is resolved at.
 * @returns The Price id to bill at, or null when neither source has one.
 */
export function resolveLinePriceId(
  record: ProductPriceRecord | null,
  catalogItem: CatalogItem,
  now: Date
): string | null {
  if (!record) return catalogItem.priceId ?? null
  return effectivePriceId(record, now) ?? catalogItem.priceId ?? null
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
  /**
   * The Stripe Price this line would bill at in live mode — the CMS's effective
   * price, or the provisioned catalog price when the CMS is blank.
   */
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
 * @param options.requirePriceId - Live mode: every line must resolve to a
 *   Stripe Price from the CMS **or** the catalog (test mode bills inline
 *   `price_data` instead).
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

    const priceId = resolveLinePriceId(record, catalogItem, now)

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
        message: `“${catalogItem.label}” has no price — set its price in the CMS or add it to the catalog.`,
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
