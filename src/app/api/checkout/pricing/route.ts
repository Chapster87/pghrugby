import { NextResponse } from "next/server"

import { resolveLineDisplay } from "@/lib/checkout/price-display"
import { resolveProductRecords } from "@/lib/checkout/product-records"

/**
 * POST /api/checkout/pricing  { skus: string[] }
 *
 * Resolves the browser-held cart's **display** pricing: what each line shows,
 * which is the sale amount while a sale runs, with the regular amount behind it
 * to strike through.
 *
 * The sale amount lives in Stripe and the resolution needs a server-only key, so
 * it goes through here rather than shipping sale amounts into the catalog — the
 * same reason thumbnails have their own route. Body: { skus }.
 * Returns: { pricing: { [sku]: { unitAmount, compareAtAmount } } }.
 *
 * Every failure — an unknown sku, a CMS hiccup, a Stripe error — answers with an
 * empty map rather than failing the batch: the surface then falls back to the
 * catalog's regular amount, which is exactly what it showed before sales existed.
 * A display miss must never break the cart.
 */

/** Bound on one request; a cart is a handful of lines, not a catalog dump. */
const MAX_SKUS = 50

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const raw = (body as { skus?: unknown } | null)?.skus

  const skus = Array.isArray(raw)
    ? [
        ...new Set(raw.filter((sku): sku is string => typeof sku === "string")),
      ].slice(0, MAX_SKUS)
    : []

  if (skus.length === 0) {
    return NextResponse.json({ pricing: {} })
  }

  try {
    const records = await resolveProductRecords(skus)
    const display = await resolveLineDisplay(skus, records)
    return NextResponse.json({ pricing: Object.fromEntries(display) })
  } catch {
    return NextResponse.json({ pricing: {} })
  }
}
