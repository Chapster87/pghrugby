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

## Implementation (2026-09-25)

Built for
[SC7s additional-side coupon and promotion code](https://github.com/Chapster87/pghrugby/issues/86).

- **The ladder** lives in `src/lib/checkout/sc7s-discount.ts` as
  `SC7S_EXTRA_COUPON_IDS` — `sc7s-extra-1` … `sc7s-extra-5`, `$25 × extras`,
  capped at `SC7S_MAX_EXTRA_TEAMS = 5` (beyond the cap the largest rung applies).
  The selection is pure and proves itself offline in
  `pnpm sc7s-discount:round-trip`.
- **Provisioned** by extending `scripts/provision-stripe-catalog.mjs`: the coupon
  blocks in `docs/agents/stripe-catalog-approval.md`, each a flat `amount_off`
  whose `applies_to` is **derived** from the checked `family=tournament` products
  (so a division added there is covered without editing the coupon section), plus
  `EXTRASIDE` as the promotion code on `sc7s-extra-1`. The script creates and
  never retires; the two retired products were archived by hand.
  - **A current-API detail** the "Verified constraints" section above predates:
    `POST /v1/promotion_codes` now takes the coupon **nested** as
    `promotion: { type: "coupon", coupon }`. The old flat `coupon` param is gone
    and fails with `parameter_unknown`. The Checkout Session's
    `discounts[].coupon` / `discounts[].promotion_code` are unchanged, so the
    session route is unaffected.
- **Teams are counted in units, not lines.** This doc's decision says
  "registration lines", but a division line's quantity _is_ teams: two adds are
  two quantity-1 lines (a registration line never merges), while a
  quantity-bearing line carries its teams in its quantity. Counting units covers
  both shapes and reads the same for the two-add cart the criteria describe.
- **A code applies to a one-team cart only**, and the rule lives once, as
  `canUsePromotionCode` — the route, the flyout's note and `selectDiscount` all
  ask the same function, because three callers disagreeing about it is exactly
  how a code ends up refusing a session it has no bearing on. The coupon is
  restricted to the division products, so a cart with no SC7s team has nothing
  for the code to discount, and one that qualifies (2+ teams) takes the automatic
  coupon instead — so the two can never stack and Stripe's one-code-per-session
  limit is never reached.
- **Where the buyer enters it.** The promotion-code field is in the cart flyout
  (the cart surface, per spec § 7.5); the code rides to the session build with the
  entries. The build resolves it to a promotion code id only when the cart could
  apply it, and an unresolvable code is then a `400` refusal raised **before** the
  snapshot is written — so an irrelevant code never blocks a cart, and a refused
  one leaves no `carts` row.
- **`applies_to` and test mode.** A test-mode session bills inline `price_data`,
  and the Product Stripe mints for it is not in `applies_to` — so a local
  rehearsal shows no discount even on a qualifying cart. That is inherent to
  `applies_to` (which is precisely what stops the coupon discounting non-SC7s
  lines in a mixed cart), not a bug. The discount itself is therefore a live-mode
  behaviour; what the offline round-trip proves is which coupon a cart selects.

**Outstanding:** the two DatoCMS `product` records still exist. They cannot sell
anything — `toLines` in `src/app/(core)/product/[slug]/page.tsx` renders no row
for a sku the catalog does not hold, so the SC7s PDP shows no add-on even if the
record is still linked — but archiving or deleting them is the tidy-up the
section below asks for.

## Consequence for the DatoCMS migration

`docs/agents/datocms-pdp-buckets-migration.md` previously listed the two
additional-side products in the SC7s `addonProducts`. With them retired, the SC7s
PDP has **no add-ons**; the backfill must not place them, and the two DatoCMS
`product` records (plus their Stripe products) are archived or deleted.
