import "server-only"

import { stripe } from "./stripe"

/**
 * Fallback thumbnail for a cart line whose Stripe Product has no image. The club
 * has not populated images for every product yet (ticket #64), so the cart-line
 * card renders this instead of a broken image. Swap for a dedicated placeholder
 * asset when one is chosen.
 */
export const FALLBACK_PRODUCT_IMAGE = "/logo.png"

/** Resolved thumbnails, keyed by Stripe Price id (process-lifetime cache). */
const thumbnailCache = new Map<string, string>()

/**
 * Resolve a cart line's thumbnail from Stripe.
 *
 * Line-item imagery comes from the Stripe **Product**, never a mirrored catalog:
 * expand the Price's Product and read `Product.images[0]` (see
 * `docs/agents/stripe-checkout-registration-metadata.md`). Products with no
 * image resolve to `FALLBACK_PRODUCT_IMAGE`.
 *
 * @param priceId - The Stripe Price id backing the line.
 * @returns The thumbnail URL, or the fallback when Stripe has no image.
 */
export async function getLineThumbnailUrl(priceId: string): Promise<string> {
  const cached = thumbnailCache.get(priceId)
  if (cached) return cached

  const image =
    (await resolveStripeProductImage(priceId)) ?? FALLBACK_PRODUCT_IMAGE
  thumbnailCache.set(priceId, image)
  return image
}

/**
 * Read the first image off a Price's expanded Product.
 *
 * @param priceId - The Stripe Price id to expand.
 * @returns The image URL, or `undefined` when there is none.
 */
async function resolveStripeProductImage(
  priceId: string
): Promise<string | undefined> {
  if (!stripe) return undefined

  const price = await stripe.prices.retrieve(priceId, { expand: ["product"] })
  const product = price.product

  if (typeof product === "string" || !("images" in product)) return undefined
  return product.images[0]
}
