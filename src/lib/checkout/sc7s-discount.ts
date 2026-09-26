/**
 * The Steel City 7s additional-side discount — the pure half of the Checkout
 * Session's `discounts`.
 *
 * The additional side is a **gender-neutral discount**, not a buyable product
 * (`docs/agents/sc7s-additional-side-pricing.md`): the two
 * `sc7s-*-additional-side` items are retired, and a flat `amount_off` coupon
 * restricted to the division products is applied instead. There are two ways in,
 * and both funnel into the session's **single** `discounts` slot:
 *
 * 1. **Same session** — the cart holds more than one SC7s team, so extras =
 *    teams − 1 and the matching per-count coupon applies automatically.
 * 2. **Returning later** — a one-team cart plus an entered promotion code
 *    (provisioned as `EXTRASIDE`, mapped to `sc7s-extra-1`).
 *
 * Checkout accepts **one** coupon or promotion code per session, so the two can
 * never stack: a cart that already qualifies ignores an entered code rather than
 * discounting twice.
 *
 * Deliberately not `server-only`: the session build and the offline round-trip
 * share this one implementation, and none of it needs a Stripe client — the
 * caller resolves an entered code to a promotion code id before it arrives here.
 */

import { isPricedLine, type CartEntry } from "./cart-entries"

/**
 * The five SC7s division skus — what the coupon's `applies_to` restricts it to,
 * and what the cart is counted by. Mirrors the `tournament.divisions` entries in
 * `catalog.ts`; keep the two in step.
 */
export const SC7S_DIVISION_SKUS = [
  "sc7s-mens-open",
  "sc7s-mens-social",
  "sc7s-mens-super-social",
  "sc7s-womens-open",
  "sc7s-womens-social",
] as const

/**
 * How many extra teams get a coupon of their own. Beyond the cap the largest
 * coupon applies, so a seven-team cart is discounted as far as the ladder goes
 * rather than falling through to no discount at all.
 */
export const SC7S_MAX_EXTRA_TEAMS = 5

/**
 * The per-count coupon ids, in extras order: index `n` is the coupon for `n + 1`
 * extra teams, discounting `$25 × (n + 1)`.
 *
 * Deliberately carries no amount: the amounts live in Stripe, approved in
 * `docs/agents/stripe-catalog-approval.md` and created by
 * `scripts/provision-stripe-catalog.mjs`. Nothing here reads one — this module
 * only decides *which rung* a cart earns, so a second copy of the figure could
 * only drift.
 */
export const SC7S_EXTRA_COUPON_IDS = Array.from(
  { length: SC7S_MAX_EXTRA_TEAMS },
  (_, index) => `sc7s-extra-${index + 1}`
)

/** One Checkout Session discount — Stripe's one-or-the-other shape. */
export type SessionDiscount = { coupon: string } | { promotion_code: string }

/** Whether a sku is one of the five SC7s division products. */
function isSc7sDivisionSku(sku: string): boolean {
  return (SC7S_DIVISION_SKUS as readonly string[]).includes(sku)
}

/**
 * Counts the SC7s teams in the cart.
 *
 * Teams are **units**, not lines: every unit of a division line's quantity is
 * one team. That covers both shapes the cart can hold — two adds are two
 * quantity-1 lines (a registration line never merges), while a quantity-bearing
 * division line carries its teams in its quantity — and both read the same.
 *
 * @param entries - The cart's entries, in add order.
 * @returns The number of SC7s teams (0 when no division line is in the cart).
 */
export function sc7sTeams(entries: CartEntry[]): number {
  let teams = 0
  for (const line of entries) {
    if (isPricedLine(line) && isSc7sDivisionSku(line.sku)) {
      teams += line.quantity
    }
  }
  return teams
}

/** The coupon id for `extras` extra teams, capped at the ladder's top rung. */
function couponForExtras(extras: number): string {
  const index = Math.min(extras, SC7S_MAX_EXTRA_TEAMS) - 1
  return SC7S_EXTRA_COUPON_IDS[index]
}

/**
 * The coupon a cart's SC7s extras earn on their own, or null when there is
 * nothing to discount.
 *
 * The first team is full price — the discount is for the *additional* side — so
 * extras are `teams − 1`, and a one-team cart earns nothing automatically.
 *
 * @param entries - The cart's entries.
 * @returns The per-count coupon id, or null for fewer than two teams.
 */
export function sc7sAutoCouponId(entries: CartEntry[]): string | null {
  const extras = sc7sTeams(entries) - 1
  return extras < 1 ? null : couponForExtras(extras)
}

/**
 * Whether a cart can use an entered promotion code at all: it holds exactly one
 * SC7s team.
 *
 * The single home of that rule, because three callers need it and disagreeing
 * about it is what makes a code refuse a session it has no bearing on. One team
 * is the case the code exists for (the returning buyer's second team); a cart
 * that already qualifies takes the automatic coupon instead, and one with no
 * division line has nothing for the coupon to discount.
 *
 * @param entries - The cart's entries.
 * @returns Whether an entered code could apply to this cart.
 */
export function canUsePromotionCode(entries: CartEntry[]): boolean {
  return sc7sTeams(entries) === 1
}

/**
 * The session's single discount: the automatic per-count coupon when the cart
 * qualifies, otherwise the buyer's entered promotion code.
 *
 * A code is returned only for a cart that can use one (`canUsePromotionCode`). A
 * qualifying cart always wins, so a code can never be applied on top of the
 * automatic coupon and Stripe's one-code-per-session limit is never reached.
 *
 * @param entries - The cart's entries.
 * @param promotionCodeId - The Stripe promotion code id the buyer entered,
 *   already resolved by the caller; null/undefined when none was entered.
 * @returns The one discount to pass, or null for none.
 */
export function selectDiscount(
  entries: CartEntry[],
  promotionCodeId?: string | null
): SessionDiscount | null {
  const auto = sc7sAutoCouponId(entries)
  if (auto) return { coupon: auto }

  if (promotionCodeId && canUsePromotionCode(entries)) {
    return { promotion_code: promotionCodeId }
  }
  return null
}
