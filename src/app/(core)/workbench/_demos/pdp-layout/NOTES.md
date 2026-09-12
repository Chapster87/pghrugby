# PDP layout — prototype notes

**Question** ([wayfinder #62](https://github.com/Chapster87/pghrugby/issues/62)):
which PDP layout do we want? Specifically: gallery placement and behaviour,
option selector, add-on presentation, and add-to-cart placement.

**Status:** direction picked (side-by-side) and signed off. The prototype is
retained as the reference for implementation — not deleted.

## Verdict

**Side-by-side.** The club won't have strong enough imagery to carry a large top
hero, so the gallery sits beside the buy box as a one-at-a-time carousel rather
than leading the page. The hero + sticky rail and shelf + sticky action bar
directions were prototyped and dropped.

Refinements applied:

1. DataCollector moved into the buy box, above the add-to-cart.
2. The bottom add-to-cart was removed; there is now a single add-to-cart.
3. The below-the-fold area is a tabbed panel (Description / Includes / Good to
   know), prototyped with Radix Tabs inline.
4. On a `variation` page, selecting a division renders a price card (name +
   price in a white block) below the dropdown, matching the simple case.
5. The date/location meta line sits under the title, above the short
   description, with a "read the full description" anchor (smooth scroll).
6. The shared `QuantitySelector` was restyled to the global field look (32px
   buttons, 16px icons) — a real change, kept.

Full decision: `docs/agents/pdp-layout-direction.md`.

## How to run

```
pnpm dev
```

Then open:

- http://localhost:8000/workbench/pdp-layout?product=golf-outing-2026
- http://localhost:8000/workbench/pdp-layout?product=annual-forge-pig-roast
- http://localhost:8000/workbench/pdp-layout?product=steel-city-7s-2026

Switch fixtures with the toggle at the top (or `?product=`):

| `product` | Exercises |
| --- | --- |
| `golf-outing-2026` | `simple`, one primary, quantity-bearing add-ons, sold-out add-on, sale price, DataCollector (repeatable golfers) |
| `annual-forge-pig-roast` | `simple`, one quantity-bearing primary, **no DataCollector**, no add-ons |
| `steel-city-7s-2026` | `variation`, multi-primary dropdown + price card, sold-out primary |

The option selector follows the settled control semantics from
[Grilling: PDP product model](https://github.com/Chapster87/pghrugby/issues/69)
(simple = the one primary; variation = dropdown, no preselection, sold-out
options disabled) — **not** the "radio group" wording in #62, which #69
supersedes.

## Throwaway by intent

Synthetic fixtures only — no DatoCMS, Stripe, or cart API; the add-to-cart button
is a stub. When the layout is built for real, delete this folder.
