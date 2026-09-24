import "server-only"

import { executeQuery } from "@/lib/datocms/executeQuery"
import { graphql } from "@/lib/datocms/graphql"

import type { ProductPriceRecord } from "./cart-pricing"

/**
 * The cart's sku → DatoCMS `product` read.
 *
 * One CDA query resolves every sku the cart holds to the record that carries
 * availability and the price ids; the window comparison itself is pure and
 * lives in `cart-pricing.ts`. The read rides the shared `datocms` cache tag, so
 * a publish reaches it by webhook rather than by expiring it here
 * (`docs/pdp-to-minicart-to-checkout-spec.md` § 8.1).
 *
 * The cart and the checkout path are deliberately coupled to DatoCMS from here
 * on — the old "cart is catalog-only" reading no longer holds
 * (`docs/agents/pdp-product-model.md` § 3).
 */

export const cartProductRecordsQuery = graphql(`
  query CartProductRecordsQuery($skus: [String!]!) {
    allProducts(filter: { sku: { in: $skus } }) {
      sku
      inStock
      priceId
      salePriceId
      saleStartsAt
      saleEndsAt
    }
  }
`)

/**
 * Resolves the cart's skus to their DatoCMS product records.
 *
 * A sku with no record is simply absent from the returned map — the caller
 * turns that into a per-line error, so an unpublished or renamed product refuses
 * its line instead of vanishing from the cart.
 *
 * @param skus - The skus to resolve; duplicates are collapsed.
 * @returns The records, keyed by sku.
 */
export async function resolveProductRecords(
  skus: string[]
): Promise<Map<string, ProductPriceRecord>> {
  const unique = [...new Set(skus.filter((sku) => sku.length > 0))]
  if (unique.length === 0) return new Map()

  const result = await executeQuery(cartProductRecordsQuery, {
    variables: { skus: unique },
  })

  const records = new Map<string, ProductPriceRecord>()
  for (const record of result.allProducts) {
    if (!record.sku) continue
    records.set(record.sku, {
      sku: record.sku,
      inStock: record.inStock,
      priceId: record.priceId,
      salePriceId: record.salePriceId,
      saleStartsAt: record.saleStartsAt,
      saleEndsAt: record.saleEndsAt,
    })
  }
  return records
}
