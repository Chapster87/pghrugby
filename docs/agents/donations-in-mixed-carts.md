# Donations: fixed presets in the cart, pay-what-you-want standalone

Status: **decided 2026-09-13** for
[Grilling: Donations in a mixed cart (PWYW constraint)](https://github.com/Chapster87/pghrugby/issues/59)
on
[Wayfinder map: Multi-product PDP to minicart to checkout](https://github.com/Chapster87/pghrugby/issues/54).

Resolves the pay-what-you-want constraint left open by
[Grilling: Pay-what-you-want donation UX](https://github.com/Chapster87/pghrugby/issues/18)
(map #1) and the Donate boundary noted in `docs/agents/pdp-product-model.md` § 6.
#18 chose fixed presets and no custom-amount flow; this keeps that for the cart
and reintroduces any-amount giving as a **separate, standalone checkout** the
cart and flyout never touch.

## The Stripe constraint (not a design choice)

A `custom_unit_amount` (customer-entered) Price must be the session's **only**
line item, quantity 1, and it forbids discounts and promotion codes
(`docs/agents/stripe-embedded-checkout-capabilities.md` § 3). Since
[Grilling: Steel City 7s additional-side pricing](https://github.com/Chapster87/pghrugby/issues/71)
made the additional side a coupon, even a _discounted_ cart is incompatible with
pay-what-you-want. A PWYW line can therefore **never** ride the mixed-cart
session the flyout builds — the rule survives the mixed cart.

## 1. Preset donations are ordinary cart lines

- A fixed preset is a plain `PricedLine` per `docs/agents/cart-line-model.md`:
  no collector entry, never a registration-bearing primary or an add-on, merges
  by sku like any plain line.
- `quantity_bearing: false`, so the flyout shows `Qty. 1`. A larger gift picks a
  larger preset; donations are always quantity 1 (per #18).
- `family=donation` stays Stripe product metadata, so
  [Grilling: Orders + reporting shape for mixed carts](https://github.com/Chapster87/pghrugby/issues/60)
  can split donations out; nothing donation-specific in the cart shape.
- `submit_type`: `'pay'` whenever a real product rides along; `'donate'` only on
  a donation-only session.

## 2. The preset ladder

The live/provisioned ladder is canonical: `donation-club` **$10 / $25 / $50**
plus `donation-pass-the-hat` **$1** (as approved in
`docs/agents/stripe-catalog-approval.md`, mirrored in `catalog.ts` and the Donate
PDP's `primary_products`). #18's recorded **$25/$50/$100/$250/$500** ladder is
**stale** — superseded by the later catalog approval.

## 3. Any-amount giving is standalone-only

- A true pay-what-you-want donation **exists**, but only as its own sole-line
  Checkout Session. It never enters the cart or the flyout.
- Amount capture is **Stripe-native**: mint `donation-club-pwyw`, a
  `custom_unit_amount` Price with `preset` **$50**, `minimum` **$1**,
  `maximum` **$10,000**. This names the `donation-club-any` slot proposed in
  `docs/agents/stripe-catalog-spec.md` § 2.5. Minting it is build work the spec
  hands off.
- The live **"Pay the Forge"** custom-amount product is **not** reused.
- **Surfacing.** The flow lives on the Donate PDP beside the presets, as a
  distinct "give any amount" affordance — its own CTA, never a cart primary.
  When the cart is non-empty it **still proceeds**: it opens its own session, the
  browser-held cart is untouched and can be checked out afterwards, and the
  control states plainly that it is a separate payment ("this donation goes
  through on its own — your cart is not included"). No blocking, hiding, or
  cart-clearing.

## 4. Donate PDP modelling

Amended by
[Grilling: Donate PDP preset selection under the single-price product model](https://github.com/Chapster87/pghrugby/issues/75)
— the club presets are now one `product` record each, and the any-amount record
is the repurposed `donation-club` record (detail in
`docs/agents/donate-pdp-preset-selection.md`).

- `product_type: variation` stays **cart-primaries only**, but its primaries are
  the three club presets (`donation-club-preset-10` / `-25` / `-50`) followed by
  `donation-pass-the-hat`, confirming the deferral in `pdp-product-model.md` § 4.
  The any-amount option is not a primary and not a cart line.
- The any-amount option is a `product` record (`donation-club`, `sku`
  `donation-club-any`, `price_id` = the custom-amount Price, with `in_stock` and
  a label) referenced by a **dedicated standalone page field** on
  `product_detail_page` — not `primary_products` — consistent with #72's "price
  authority lives in DatoCMS". The field and record are build work the spec
  hands off.
