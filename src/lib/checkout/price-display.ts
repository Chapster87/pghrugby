import "server-only"

import { isSaleRunning, type ProductPriceRecord } from "./cart-pricing"
import type { LineDisplay } from "./cart-display"
import { findCatalogItem } from "./catalog"
import { liveStripe } from "./stripe"

/**
 * What a line *displays*: the amount the buyer pays while a sale runs, and the
 * regular amount to show struck through behind it.
 *
 * Display only. The amount a session actually bills at is the Price id resolved
 * by `cart-pricing.ts` — Stripe's, never this module's — so a display that drifts
 * can mislead, but it can never mis-charge.
 *
 * The regular amount comes from `catalog.ts` (code, no network). The sale amount
 * can only come from Stripe: the sale is a second Price object, and DatoCMS holds
 * its *id*, not its amount. That read goes to the live account (`liveStripe`) —
 * see the note on that client for why.
 */

/** Sale Price amounts, keyed by Price id (process-lifetime cache). */
const saleAmountCache = new Map<string, number | null>()

/**
 * Reads a sale Price's amount from the live account.
 *
 * @param priceId - The Stripe Price id the CMS names as the sale Price.
 * @returns The amount in minor units, or null when it cannot be resolved (no
 *   live key, an unknown or deactivated Price, a Price with no unit amount).
 */
async function saleAmountFor(priceId: string): Promise<number | null> {
  const cached = saleAmountCache.get(priceId)
  if (cached !== undefined) return cached

  let amount: number | null = null
  if (liveStripe) {
    try {
      const price = await liveStripe.prices.retrieve(priceId)
      amount = typeof price.unit_amount === "number" ? price.unit_amount : null
    } catch {
      // Unresolvable is not a failure to display: the line shows its regular
      // amount, exactly as it did before a sale was configured.
      amount = null
    }
  }

  saleAmountCache.set(priceId, amount)
  return amount
}

/**
 * Resolves the display pricing for a set of skus.
 *
 * A sku is on sale when its record's sale Price is running and its amount is
 * resolvable **and cheaper** — a "sale" that costs more is not a discount, so it
 * renders as the plain regular price rather than struck through. Everything else
 * resolves from the catalog alone, with no network.
 *
 * @param skus - The skus to resolve; unknown ones are simply absent.
 * @param records - The skus' CMS records, as `product-records.ts` reads them.
 * @param options.now - The instant the sale windows are resolved at.
 * @returns The display pricing per sku.
 */
export async function resolveLineDisplay(
  skus: string[],
  records: Map<string, ProductPriceRecord>,
  options: { now?: Date } = {}
): Promise<Map<string, LineDisplay>> {
  const now = options.now ?? new Date()
  const display = new Map<string, LineDisplay>()

  await Promise.all(
    [...new Set(skus)].map(async (sku) => {
      const catalogItem = findCatalogItem(sku)
      if (!catalogItem) return

      const regular: LineDisplay = {
        unitAmount: catalogItem.unitAmount,
        compareAtAmount: null,
      }

      const record = records.get(sku)
      if (!record?.salePriceId || !isSaleRunning(record, now)) {
        display.set(sku, regular)
        return
      }

      const saleAmount = await saleAmountFor(record.salePriceId)
      display.set(
        sku,
        saleAmount !== null && saleAmount < catalogItem.unitAmount
          ? { unitAmount: saleAmount, compareAtAmount: catalogItem.unitAmount }
          : regular
      )
    })
  )

  return display
}
