# PDP layout: chosen direction

Status: **decided 2026-09-12** for
[Prototype: PDP layout directions](https://github.com/Chapster87/pghrugby/issues/62)
on
[Wayfinder map: Multi-product PDP to minicart to checkout](https://github.com/Chapster87/pghrugby/issues/54).

Companion to `docs/agents/pdp-product-model.md` (what renders) — this fixes
**how** a PDP is laid out.

## 1. Direction

Side-by-side (**direction B** of the prototype). The club does not expect strong
enough imagery to carry a large top-of-page hero, so the gallery sits beside the
buy box rather than leading the page. A large hero + sticky rail, and an
option-shelf + sticky action bar, were prototyped and dropped.

## 2. Layout

Desktop: two columns above the fold.

- **Left column** — the page gallery, as a one-at-a-time carousel.
  - Prev/next controls, icon-only (Lucide `ChevronLeft` / `ChevronRight`).
  - Position dots over the image.
  - Touch targets: nav buttons 44px; dots 30px with a 10px visible dot, so they
    stay visually small while remaining tappable.
- **Right column** — the buy box, in this order:
  1. Title.
  2. Short description.
  3. "Read the full description" anchor — smooth-scrolls to the description panel
     below the fold. A real `#` anchor with a JS enhancement, honouring
     `prefers-reduced-motion`.
  4. Option selector (§ 3).
  5. Add-ons (§ 4).
  6. DataCollector — **in the buy box, above the add-to-cart** (§ 7).
  7. Running total.
  8. **One** add-to-cart button.

Mobile: single column, gallery above the buy box.

## 3. Option selector

Follows the control semantics in `docs/agents/pdp-product-model.md`:

- `simple` — the one primary renders as a **price card**: name + price in a
  white bordered block, with a quantity stepper only when `quantity_bearing`.
- `variation` — a dropdown (Radix Select) with no preselection and sold-out
  options disabled; **selecting an option renders the same price card** below
  the dropdown.
- `grouped` — the price-card treatment repeated per selected primary, each with
  its own stepper. A mechanical extension of the above; not prototyped
  separately and left to the spec.

## 4. Add-ons

Optional checkbox rows. Each shows its price and a stepper when
`quantity_bearing`. Sold-out add-ons render disabled and labelled "Sold out" —
never hidden.

## 5. Bottom area

Below the fold is a single panel, not a plain long-description block, so more
product data can be added without lengthening the page:

- **Description** — the long copy (the primary product's `longDescription`).
- **Includes** — a bulleted list.
- **Good to know** — practical notes.

A panel renders **only when the CMS has content for it**; a panel with none is
not rendered at all. Description is the only panel with a source, so every live
PDP renders it alone, as a section with its heading — one panel needs no control
of its own.

Implementation note: the prototype used Radix Tabs inline. **Amended
2026-09-24** ([#117](https://github.com/Chapster87/pghrugby/issues/117)): the
fixed tab set is dropped in favour of the content-driven rule above, because
`product_detail_page` has no field for **Includes** or **Good to know** — nor for
the date / location meta line § 2 once asked for. Should the club want those
panels, the field comes first and a global wrapper (`@components/tabs`, once more
than one panel has content) follows it; recorded as deferred in
`docs/pdp-to-minicart-to-checkout-spec.md` § 13.

## 6. Quantity control

The shared `QuantitySelector` is restyled to match the global field controls
(white, `1px #ccc`, `4px` radius, `1rem`), with 32px buttons and 16px Lucide
`Minus` / `Plus` icons. Any quantity-bearing line uses it.

## 7. DataCollector

Rendered in the buy box above the add-to-cart; fields are unchanged from
`docs/agents/pdp-product-model.md` (repeatable fields, etc.). The "+ Add …"
control is the shared `Button` at `variant="primary" size="small"`.

## 8. Prototype

The reference prototype lives on as a dev-only workbench demo, kept as a record
for implementing this layout:

```
/workbench/pdp-layout?product=golf-outing-2026      # simple + add-ons + collector
/workbench/pdp-layout?product=annual-forge-pig-roast # simple, no collector
/workbench/pdp-layout?product=steel-city-7s-2026     # variation, multi-primary
```

Code: `src/app/(core)/workbench/_demos/pdp-layout/` (fixtures, state, shared
parts, the layout). It is dev-only (the workbench 404s in production) and uses
synthetic fixtures — no DatoCMS, Stripe, or cart API. Delete it once the layout
is built for real.
