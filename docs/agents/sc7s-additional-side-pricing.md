# Steel City 7s additional-side pricing

Status: **decided 2026-09-12** for
[Grilling: Steel City 7s additional-side pricing (line, qty modifier, or promo code)](https://github.com/Chapster87/pghrugby/issues/71)
on
[Wayfinder map: Multi-product PDP to minicart to checkout](https://github.com/Chapster87/pghrugby/issues/54).

## Decision

The additional side is a **discount**, applied with Stripe **coupons +
promotion codes**, not a buyable product. It is **gender-neutral** — "2 teams is
2 teams".

- The buyable products `sc7s-mens-additional-side` and
  `sc7s-womens-additional-side` are **retired** (removed from the PDP add-ons,
  the checkout catalog, and archived in Stripe).
- A coupon `applies_to` the five SC7s division products and discounts by a flat
  `amount_off` per extra team ($25 on the current $400 entry / $375 addition).
- The discount is applied two ways, both funnelling into the Checkout Session's
  `discounts`:
  1. **Same session** — the server counts SC7s registration lines; extras =
     count − 1; if extras ≥ 1 it applies the matching per-count coupon
     automatically. No code needed.
  2. **Returning later** — a **promotion code** (e.g. `EXTRASIDE`) mapping to the
     1-extra coupon. The buyer enters it in the cart, the server validates it
     against the Stripe promotion codes API and passes
     `discounts: [{ promotion_code }]`. No login, no order lookup.
- **Per-count coupons** were chosen over a single flat coupon so each extra team
  is discounted: `sc7s-extra-1` ($25), `sc7s-extra-2` ($50), … capped at a small
  N (proposed 5; beyond the cap the largest coupon applies). The return-case code
  maps to `sc7s-extra-1`.
- If the cart already qualifies automatically, the entered code is **not** applied
  on top — Checkout allows only one coupon/promotion code per session, and we must
  not double-discount.

## Verified constraints (Stripe docs)

- Coupons carry `percent_off` or `amount_off`, `currency`, `max_redemptions`,
  `redeem_by`, and `applies_to` (limit eligible products).
- Promotion codes layer on a coupon, with `expires_at`, `max_redemptions`,
  first-time and `minimum_amount` restrictions.
- **Checkout Sessions support up to one coupon or promotion code**, applied once
  to the session subtotal (or only to `applies_to` products) — never per unit.
- Embedded Checkout supports discounts.
- Source: `https://docs.stripe.com/payments/checkout/discounts`.

## Interaction with other pricing

- **Early bird is price-level** ([Grilling: Scheduled sale / early-bird pricing](https://github.com/Chapster87/pghrugby/issues/72)),
  so the additional-side coupon can apply on top of an early-bird price — a
  coupon-based early bird could not have stacked, given the one-code limit.

## Implementation notes

- Coupons and the promotion code are provisioned alongside the catalog (extend
  `scripts/provision-stripe-catalog.mjs`); `catalog.ts` drops the two
  additional-side items and their `priceId`s.
- The session route (`src/app/api/checkout/sessions/route.ts`) gains the
  count-and-select-coupon step; the cart UI gains the promotion-code field.
- The line semantics — whether two teams are two line items each with its own
  registration, or one line with quantity — come from
  [Grilling: Cart line model (add-ons, merging, quantities, edits)](https://github.com/Chapster87/pghrugby/issues/57).
  The coupon count follows whatever that ticket decides (this doc assumes one
  registration per line, per map Foundation 2).

## Consequence for the DatoCMS migration

`docs/agents/datocms-pdp-buckets-migration.md` previously listed the two
additional-side products in the SC7s `addonProducts`. With them retired, the SC7s
PDP has **no add-ons**; the backfill must not place them, and the two DatoCMS
`product` records (plus their Stripe products) are archived or deleted.
