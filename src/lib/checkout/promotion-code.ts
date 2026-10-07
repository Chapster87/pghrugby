import "server-only"

import type Stripe from "stripe"

/**
 * Resolves a buyer-entered promotion code to its Stripe promotion code id.
 *
 * Stripe is the authority on a code's usability, but a session built with a
 * lapsed or fully-redeemed code fails there with an opaque error, so the two
 * conditions Stripe would refuse on are checked here and read as "no such code".
 * Codes are case-insensitive.
 *
 * The client is passed in because the two callers read different accounts on
 * purpose: the session build resolves against the **billing** account (the one
 * that will apply the code), while the cart-discount display read resolves
 * against the **live** account, exactly as `price-display.ts` does — the amounts
 * the site advertises are live whatever `STRIPE_ENV` says.
 *
 * @param client - The Stripe client to resolve against.
 * @param code - The code as the buyer typed it.
 * @returns The promotion code id, or null when no active, redeemable code matches.
 */
export async function resolvePromotionCodeId(
  client: Stripe,
  code: string
): Promise<string | null> {
  const { data } = await client.promotionCodes.list({
    code,
    active: true,
    limit: 1,
  })
  const promotion = data[0]
  if (!promotion) return null

  if (promotion.expires_at && promotion.expires_at * 1000 <= Date.now()) {
    return null
  }
  if (
    promotion.max_redemptions != null &&
    promotion.times_redeemed >= promotion.max_redemptions
  ) {
    return null
  }
  return promotion.id
}

/**
 * The underlying coupon id of a resolved promotion code.
 *
 * The Checkout Session's `discounts[].promotion_code` names the promotion code,
 * not its coupon, but a coupon's `amount_off` is what a surface must display —
 * so a display read has to take this one extra hop.
 *
 * @param client - The Stripe client to resolve against.
 * @param promotionCodeId - A promotion code id from `resolvePromotionCodeId`.
 * @returns The coupon id, or null when the code or its coupon cannot be read.
 */
export async function couponIdForPromotionCode(
  client: Stripe,
  promotionCodeId: string
): Promise<string | null> {
  try {
    const promotion = await client.promotionCodes.retrieve(promotionCodeId)
    // The current API nests the underlying coupon under `promotion`; the older
    // flat `coupon` property is gone.
    const coupon = promotion.promotion?.coupon
    if (!coupon) return null
    return typeof coupon === "string" ? coupon : coupon.id
  } catch {
    return null
  }
}
