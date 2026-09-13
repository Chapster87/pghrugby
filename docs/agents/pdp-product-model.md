# PDP product model: product type, quantity, availability

Status: **decided 2026-09-12** for
[Grilling: PDP product model - product_type (variation/grouped), per-line quantity, in-stock](https://github.com/Chapster87/pghrugby/issues/69)
on
[Wayfinder map: Multi-product PDP to minicart to checkout](https://github.com/Chapster87/pghrugby/issues/54).

Extends the schema in `docs/agents/datocms-pdp-buckets-migration.md`; it does not
replace the three-bucket + gallery decisions there.

## 1. Product type

A `product_type` field on `product_detail_page`:

- Values: `simple` | `variation` | `grouped`. Authored (not inferred), required,
  default `simple`, with the valid values constrained by an enum validator.
- It governs **only how `primaryProducts` are selected**:
  - **Simple** — one primary, no choice.
  - **Variation** — N primaries, the buyer chooses exactly one.
  - **Grouped** — N primaries, multi-select, each chosen primary with its own
    quantity.
- `addonProducts` are always optional and independent of the type; quantity is
  orthogonal (see § 2), so a variation page can still have quantity-bearing
  add-ons.
- Validation is **hint only** — the primary-count contract (`simple` = exactly 1,
  `variation`/`grouped` = ≥2) is not enforced in the schema; a wrong type is
  visible immediately in the PDP UI.

## 2. Quantity is per-line, not per-type

- A `quantity_bearing` boolean on the `product` model. It is a property of the
  buyable (mulligans come in multiples; a season of dues does not), so it is true
  wherever that product is sold.
- `product_type` never grants or denies quantity. Any quantity-bearing line —
  primary or add-on, in any type — renders a quantity control.
- **The DataCollector never determines quantity.** This corrects existing
  behaviour: `src/app/(core)/product/[slug]/checkout-form.tsx` currently derives
  the primary line's quantity from the repeatable form field (golfers), and
  `docs/agents/stripe-catalog-spec.md` states "quantity = golfers". Both are
  wrong. The form supplies the registration payload only. If the buyer takes
  1 ticket but names 4 golfers, we may warn; we never block checkout — the club
  follows up directly at its scale.
- The cart already accepts a per-line quantity (`CheckoutSelection = { sku,
quantity }`, clamped 1–100 in `buildCart`), so this is a UI + authoring change,
  not a cart-model change.

## 3. Availability (in stock)

- An `in_stock` boolean on the `product` model, edited in the CMS.
- **On the PDP:** render the line but disable it and label it "Sold out" — never
  hide it (a division that silently vanishes reads as a bug; a visible sold-out
  division communicates that the tournament is filling). Editorial copy and the
  gallery stay readable. If no primary is available, replace the add-to-cart
  control with an unavailable/registration-closed state. The same rule covers
  add-ons and `grouped` pages (a sold-out line is disabled, the rest still add).
- **Enforcement:** the flag is not editorial-only. The server re-validates the
  cart's line items against DatoCMS `in_stock` (looked up **by sku**, one CDA
  query, cache-tagged) at two points:
  1. `POST /api/checkout/cart` — a sold-out line never enters the cart;
  2. `POST /api/checkout/sessions` — the payment boundary; the checkout page
     already calls this on load, so a sold-out line surfaces on page load.
- **On failure:** block the session and return per-line errors. The buyer removes
  the sold-out line (ideally a one-click remove) and retries. Do **not** auto-drop
  lines — the total must never silently differ from what was shown — and do not
  block the whole cart, since a mixed cart may hold valid lines beside one
  sold-out tournament division.
- This deliberately couples the checkout path to DatoCMS. The previous
  "cart is decoupled from DatoCMS / catalog-only" reading no longer holds once
  this lands.

## 4. Page classification

| Page                      | `product_type` | Notes                                                                                                                                    |
| ------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Forge Pig Roast           | `simple`       | one ticket                                                                                                                               |
| Steel City 7s Bar Crawl   | `simple`       | one ticket                                                                                                                               |
| Golf Outing               | `simple`       | one registration primary; mulligan / drink band are quantity-bearing add-ons                                                             |
| Dues                      | `variation`    | fall / spring / summer are alternatives; a player pays for exactly one season                                                            |
| Donate                    | `variation`    | club vs pass-the-hat; cart primaries only — any-amount giving is a standalone, non-cart affordance (confirmed in the donations grilling) |
| Steel City 7s             | `variation`    | five divisions are alternatives                                                                                                          |
| Forge Day at the Ballpark | `grouped`      | Adult + 16 & Under bought together, each with its own quantity                                                                           |
| NFL Survivor Pool         | `grouped`      | Ticket + Insurance bought together, each with its own quantity                                                                           |

## 5. Control semantics

| Type        | Primary selection                             | Add-ons             | Quantity                             | Add to cart          |
| ----------- | --------------------------------------------- | ------------------- | ------------------------------------ | -------------------- |
| `simple`    | implicit (the one primary)                    | optional checkboxes | stepper on any quantity-bearing line | one action           |
| `variation` | dropdown, choose exactly one, no preselection | optional checkboxes | stepper on any quantity-bearing line | one action           |
| `grouped`   | multi-select; every chosen primary included   | optional checkboxes | stepper per line                     | one "add all" action |

## 6. Boundaries / follow-ups

- **SC7s additional-side pricing** is a separate decision
  ([Grilling: Steel City 7s additional-side pricing](https://github.com/Chapster87/pghrugby/issues/71)):
  the additional side is a modifier discount, and if it becomes automatic the
  `sc7s-*-additional-side` products stop being PDP add-ons — which changes the
  SC7s `addonProducts` mapping in the migration doc. That mapping is provisional
  until #71 resolves.
- **Donations** — resolved in
  [Grilling: Donations in a mixed cart (PWYW constraint)](https://github.com/Chapster87/pghrugby/issues/59):
  fixed presets are ordinary cart lines, while any-amount giving is a standalone
  sole-line checkout that is never a cart primary — detail in
  `docs/agents/donations-in-mixed-carts.md`. Preset selection under the
  single-`price_id` model is the open follow-up
  ([Grilling: Donate PDP preset selection](https://github.com/Chapster87/pghrugby/issues/75)).
- Glossary terms added to `CONTEXT.md`: Product, Product type, Simple, Variation,
  Grouped, Data collector.
