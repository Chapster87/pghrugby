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
  2. The event meta line — the date and the location, from the page's
     `event_starts_at` / `event_location`. Omitted entirely when neither is set.
  3. Short description — the page's `short_description`, Structured Text
     restricted to links and emphasis, so a tagline can point at membership or
     registration without being able to grow into a document.
  4. "Read the full description" anchor — smooth-scrolls to the panel below the
     fold. A real `#` anchor with a JS enhancement, honouring
     `prefers-reduced-motion`; it also selects the Description panel (§ 5) before
     it scrolls.
  5. Option selector (§ 3).
  6. Add-ons (§ 4).
  7. DataCollector — **in the buy box, above the add-to-cart** (§ 7).
  8. Running total.
  9. **One** add-to-cart button.

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

Below the fold, the panel set is **authored** — one panel per content, never a
plain long-description block and never a panel with nothing in it. The page's
`tabs` field holds one block per panel, each carrying its own title and its own
structured content, so this is the club's choice of titles rather than a set
fixed here.

Two blocks are allowed on the field, and the type is the whole of what separates
them:

- **`tab_desc`** — the Description panel, and the only block the render reasons
  about. With none authored the panel is supplied from the primary product's
  `description`, so a PDP keeps a description without the copy being maintained
  twice. Authoring one replaces that default at the position it was dragged to,
  which is how the description is retitled or moved below another panel.
- **`tab`** — every other panel. The titles are the club's: "Includes", "Good to
  know" and anything else are all a `tab` carrying that title.

`title` and `content` are required on both, so an empty panel cannot be authored.
Content decides the form on top of that: a page with no product copy and no
`tab_desc` renders no Description panel, and a page with no panels renders no
strip. Otherwise the set renders through the `@components/tabs` wrapper at **any
panel count** — a lone panel is a one-tab strip, not a plain section, because the
Description panel means the set is essentially never empty. Spec:
`docs/pdp-to-minicart-to-checkout-spec.md` § 5.6.

Implementation note: the prototype used Radix Tabs inline. **Amended 2026-09-24**
([#120](https://github.com/Chapster87/pghrugby/issues/120)): an earlier
amendment — a content-driven rule with **no** page fields behind it, which left
the panel set unbuildable and the § 2 meta line with no source — is replaced. The
fields now exist (`tabs` plus `event_starts_at` / `event_location`), so the
wrapper is built for real rather than deferred. That earlier amendment was
[#117](https://github.com/Chapster87/pghrugby/issues/117), superseded by #120.

**Superseded in place 2026-09-25** ([#120](https://github.com/Chapster87/pghrugby/issues/120)):
the single `product_tab` block and its `tab` enum are gone. The owner split it
into `tab` / `tab_desc` — the type now carries the meaning the enum did — and
dropped the plain-section rule above, so a lone panel is a one-tab strip. The
render walks the authored order, placing the implicit Description panel first
only while nothing authored claims that position.

## 6. Quantity control

The shared `QuantitySelector` is restyled to match the global field controls
(white, `1px #ccc`, `4px` radius, `1rem`), with 32px buttons and 16px Lucide
`Minus` / `Plus` icons. Any quantity-bearing line uses it.

## 7. DataCollector

Rendered in the buy box above the add-to-cart; fields are unchanged from
`docs/agents/pdp-product-model.md` (repeatable fields, etc.). The "+ Add …"
control is the shared `Button` at `variant="primary" size="small"`.

## 8. Prototype

The reference prototype (`src/app/(core)/workbench/_demos/pdp-layout/`) was
deleted at the cutover ([#88](https://github.com/Chapster87/pghrugby/issues/88)),
once the real layout shipped — it used synthetic fixtures that would have drifted
from the implementation.

The three product shapes it exercised are worth keeping, as the record of what
the layout was proved against and as the scenario set the Playwright suite adopts
([#76](https://github.com/Chapster87/pghrugby/issues/76)):

| Fixture                  | Product shape                    |
| ------------------------ | -------------------------------- |
| `golf-outing-2026`       | simple + add-ons + DataCollector |
| `annual-forge-pig-roast` | simple, no collector             |
| `steel-city-7s-2026`     | variation, multi-primary         |
