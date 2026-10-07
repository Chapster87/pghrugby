import "server-only"

import {
  canUsePromotionCode,
  sc7sDiscountPerLine,
  selectDiscount,
  type CartDiscount,
} from "./sc7s-discount"
import type { CartEntry } from "./cart-entries"
import {
  couponIdForPromotionCode,
  resolvePromotionCodeId,
} from "./promotion-code"
import { liveStripe } from "./stripe"

/**
 * The cart's resolved discount, for **display** — the same SC7s additional-side
 * discount the session build will apply, returned as an amount a surface can
 * show rather than as the coupon reference Stripe needs.
 *
 * The session build is the authority on *what is applied*: this module mirrors
 * its selection with the same `selectDiscount` / `canUsePromotionCode` rules, so
 * the flyout cannot show a discount the session would not grant (or miss one it
 * would). What this adds is the figure — a coupon's `amount_off`, which lives in
 * the live account and never in code — plus a per-line attribution derived from
 * the ladder's linear shape.
 *
 * Deliberately **live-only**, like `price-display.ts`: the coupons exist in the
 * live account, and the buyer is shown the live figures whatever `STRIPE_ENV`
 * says. In a rehearsal against test this reads the live coupons anyway, so the
 * displayed saving still matches production; billing remains governed by
 * `stripe` per `STRIPE_ENV`.
 */

/** The buyer-facing name of the discount the ladder grants. */
const DISCOUNT_LABEL = "Additional side discount"

/** Coupon amounts, keyed by coupon id (process-lifetime cache). */
const couponAmountCache = new Map<string, number | null>()

/**
 * Reads a coupon's `amount_off` from the live account.
 *
 * @param couponId - The coupon id (`sc7s-extra-N`, or a promotion code's coupon).
 * @returns The amount in minor units, or null when it cannot be resolved (no
 *   live key, an unknown coupon, or a percentage coupon with no flat amount).
 */
async function couponAmount(couponId: string): Promise<number | null> {
  const cached = couponAmountCache.get(couponId)
  if (cached !== undefined) return cached

  let amount: number | null = null
  if (liveStripe) {
    try {
      const coupon = await liveStripe.coupons.retrieve(couponId)
      amount = typeof coupon.amount_off === "number" ? coupon.amount_off : null
    } catch {
      // Unresolvable is not a failure to display: the cart simply shows no
      // discount row, exactly as it did before the coupon existed.
      amount = null
    }
  }

  couponAmountCache.set(couponId, amount)
  return amount
}

/**
 * Resolves the cart's SC7s discount for display.
 *
 * @param entries - The cart's entries, in add order.
 * @param promotionCode - The buyer-entered code, if any (trimmed or empty).
 * @returns The discount total, label, and per-line split, or null when the cart
 *   earns no discount or it cannot be priced.
 */
export async function resolveCartDiscount(
  entries: CartEntry[],
  promotionCode: string
): Promise<CartDiscount | null> {
  if (!liveStripe) return null

  // Mirror the session build's selection exactly: a code is resolved only for a
  // cart that could use one, and a qualifying cart takes the automatic coupon.
  let promotionCodeId: string | null = null
  const code = promotionCode.trim()
  if (code && canUsePromotionCode(entries)) {
    try {
      promotionCodeId = await resolvePromotionCodeId(liveStripe, code)
    } catch {
      return null
    }
  }

  const selected = selectDiscount(entries, promotionCodeId)
  if (!selected) return null

  const couponId =
    "coupon" in selected
      ? selected.coupon
      : await couponIdForPromotionCode(liveStripe, selected.promotion_code)
  if (!couponId) return null

  const amount = await couponAmount(couponId)
  if (amount === null || amount <= 0) return null

  return {
    amount,
    label: DISCOUNT_LABEL,
    perLine: sc7sDiscountPerLine(entries, amount),
  }
}
