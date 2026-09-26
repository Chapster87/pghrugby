import { NextResponse } from "next/server"

import { findCatalogItem } from "@/lib/checkout/catalog"
import {
  FALLBACK_PRODUCT_IMAGE,
  getLineThumbnailUrl,
} from "@/lib/checkout/product-image"

/**
 * POST /api/checkout/thumbnails  { skus: string[] }
 *
 * Resolves cart-line thumbnails from Stripe (`Product.images[0]`, via the sku's
 * catalog Price id) for the browser-held cart, which holds only skus — the
 * resolution needs the server-only Stripe key. Body: { skus }.
 * Returns: { thumbnails: { [sku]: url } }.
 *
 * Every failure — an unknown sku, no catalog Price id, a Stripe error — answers
 * with the shared fallback rather than failing the batch: a missing thumbnail
 * must never break the flyout.
 */

/** Bound on one request; a cart is a handful of lines, not a catalog dump. */
const MAX_SKUS = 50

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const raw = (body as { skus?: unknown } | null)?.skus

  const skus = Array.isArray(raw)
    ? [
        ...new Set(
          raw.filter((sku): sku is string => typeof sku === "string")
        ),
      ].slice(0, MAX_SKUS)
    : []

  if (skus.length === 0) {
    return NextResponse.json({ thumbnails: {} })
  }

  const resolved = await Promise.all(
    skus.map(async (sku): Promise<[string, string]> => {
      const priceId = findCatalogItem(sku)?.priceId
      if (!priceId) return [sku, FALLBACK_PRODUCT_IMAGE]
      try {
        return [sku, await getLineThumbnailUrl(priceId)]
      } catch {
        return [sku, FALLBACK_PRODUCT_IMAGE]
      }
    })
  )

  return NextResponse.json({ thumbnails: Object.fromEntries(resolved) })
}
