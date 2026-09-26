import type Stripe from "stripe"

import type { QuotedLine } from "./cart-pricing"

/**
 * Donations: the preset ladder's cart rules and the standalone any-amount
 * Checkout Session.
 *
 * Two shapes, one family:
 *
 * - **Presets** are ordinary cart lines. They need no code of their own — they
 *   quote, merge, and bill exactly like any plain priced line — save for the
 *   `submit_type` the session build picks (`sessionSubmitType`).
 * - **Any amount** is a pay-what-you-want donation, which Stripe admits only as
 *   the session's **sole** line item, quantity 1, with no discounts or
 *   promotion codes. It can therefore never ride the mixed cart the flyout
 *   builds; it is its own cartless session (`anyAmountSessionParams`).
 *
 * Pure, like `cart-pricing.ts` and `order-metadata.ts`: the session routes and
 * the scripted round-trips share one implementation, and every rule here is
 * asserted offline. The DatoCMS/Stripe reads that feed it live in the routes.
 *
 * Authority: `docs/agents/donations-in-mixed-carts.md`,
 * `docs/agents/donate-pdp-preset-selection.md`, and
 * `docs/pdp-to-minicart-to-checkout-spec.md` § 8.4.
 */

/**
 * The `family` Stripe-product metadata every donation carries — presets and the
 * any-amount Price alike. The cart shape holds nothing donation-specific; this
 * one tag is what lets orders and reporting split donations out
 * (`docs/agents/order-records-and-reporting.md` § 3).
 */
export const DONATION_FAMILY = "donation"

/**
 * The catalogue sku of the any-amount record (`donation-club-any`), the
 * repurposed `donation-club` record. It is **never** a cart primary and never in
 * the cart catalog — the any-amount flow resolves its Price from the CMS record
 * of this sku directly.
 */
export const ANY_AMOUNT_SKU = "donation-club-any"

/**
 * The any-amount Price's configuration — the `custom_unit_amount` bounds the
 * Price is minted with, in minor units.
 *
 * Minting the Price (live, and lazily in the test account) is the other half of
 * this constant; the values ride here so both agree.
 */
export const ANY_AMOUNT = {
  /** The label the test-mode Product is minted under. */
  label: "Club donation — any amount",
  /** The starting amount the buyer sees, editable. */
  preset: 5000,
  /** The floor — Stripe's own minimum charge applies on top. */
  minimum: 100,
  /** The ceiling, a guard against a mistyped amount. */
  maximum: 1_000_000,
} as const

/** Checkout's `submit_type` — which purchase the flow presents itself as. */
export type SubmitType = "pay" | "donate"

/**
 * A quoted line, narrowed to the one field the donation rules read.
 *
 * The rules care about a line's `family` and nothing else — no sku, price, or
 * quantity — so they take this rather than a whole `QuotedLine`, which is what
 * lets the round-trip assert them from a two-field literal.
 */
export type FamilyBearingLine = Pick<QuotedLine, "family">

/** Whether a quoted line is a donation, by the family it carries. */
export function isDonationLine(line: FamilyBearingLine): boolean {
  return line.family === DONATION_FAMILY
}

/**
 * Whether a session is a donation-only one — every priced line a donation, and
 * at least one line.
 *
 * The empty case is deliberately **not** a donation session: a cart with no
 * lines cannot be checked out at all (`buildCartFromEntries` throws), so reading
 * it as donations would only mislabel a state that never reaches Stripe.
 *
 * @param lines - The session's priced lines, in cart order.
 * @returns Whether the lines are donations and nothing else.
 */
export function isDonationOnly(lines: FamilyBearingLine[]): boolean {
  return lines.length > 0 && lines.every(isDonationLine)
}

/**
 * The session's `submit_type`: `'donate'` on a donation-only session, `'pay'`
 * whenever a real product rides along.
 *
 * Stripe lets `submit_type` be omitted (`'pay'` is the default), but the rule is
 * the decision's, not Stripe's, so it is always stated — a donation that rides
 * beside a dues payment is a **purchase**, and the flow must read as one.
 *
 * @param lines - The session's priced lines, in cart order.
 * @returns The `submit_type` for `stripe.checkout.sessions.create`.
 */
export function sessionSubmitType(lines: FamilyBearingLine[]): SubmitType {
  return isDonationOnly(lines) ? "donate" : "pay"
}

/**
 * The Checkout Session params for a standalone any-amount donation.
 *
 * Sole-line by construction: one `custom_unit_amount` Price, quantity 1, no
 * `discounts` and no customer-facing promotion codes (Stripe refuses a session
 * that combines them with a customer-entered amount). It is cartless — no
 * `client_reference_id` and no `carts` snapshot — so a non-empty browser cart is
 * untouched and checks out afterwards.
 *
 * `customer_creation: 'always'` mirrors the cart session: it is what makes
 * Stripe mint a Customer the club can see against the payment.
 *
 * @param options.priceId - The `custom_unit_amount` Price id, resolved from the
 *   `donation-club-any` record (live) or minted in the test account.
 * @param options.returnUrl - The `return_url` the buyer lands on after payment.
 * @returns The session params, ready for `stripe.checkout.sessions.create`.
 */
export function anyAmountSessionParams({
  priceId,
  returnUrl,
}: {
  priceId: string
  returnUrl: string
}): Stripe.Checkout.SessionCreateParams {
  // `reg_ref` is deliberately absent: it is the cartRef, and a cartless order
  // has none (`docs/agents/order-records-and-reporting.md` § 4).
  const metadata = { families: DONATION_FAMILY, reg_count: "0" }

  return {
    ui_mode: "embedded_page",
    mode: "payment",
    submit_type: "donate",
    line_items: [{ price: priceId, quantity: 1 }],
    return_url: returnUrl,
    customer_creation: "always",
    metadata,
    payment_intent_data: { metadata },
  }
}
