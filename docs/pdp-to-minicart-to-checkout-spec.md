# PDP → minicart → checkout: implementation spec

Status: **assembled 2026-09-13** for
[Task: Assemble the PDP to minicart to checkout spec](https://github.com/Chapster87/pghrugby/issues/66),
the destination of
[Wayfinder map: Multi-product PDP to minicart to checkout](https://github.com/Chapster87/pghrugby/issues/54).

This is the hand-off build document for a **multi-product** storefront flow —
**PDP → minicart flyout → Stripe checkout**. It pulls together the settled
foundations, every closed ticket's resolution, and the chosen prototype
directions into one place; each section links the decision doc that holds the
fine detail. Implementation detail lives in those docs; this spec fixes the
**build contract** and the **order of work**.

Golf outing is the flagship worked example. The four orphan event products (pig
roast, ballpark, survivor pool, bar crawl) render through the same format as the
simple case.

## How to read this

- Decision docs are the source of truth for _what_ and _why_. This spec is the
  source of truth for _how it fits together_ and _what to build first_.
- Where a section restates a decision, the linked doc wins on any conflict.
- Section 11 is the work breakdown; section 12 indexes the decisions.

---

## 1. Destination and scope

The flow fixes three things:

1. the DatoCMS content model for a product detail page — main-product /
   add-on / data-collector buckets, plus a page-owned media gallery;
2. the cart's client + server data flow and its identity across PDPs — one
   browser-held cart can hold a golf registration, a pig roast ticket, and a
   dues payment; and
3. the chosen PDP + minicart layout direction.

**In scope:** the storefront flow above, the DatoCMS schema it reads, the
Supabase order/cart reshape it writes, and the SC7s coupon pricing it applies.

**Out of scope** (never graduates — see the map's _Out of scope_): cross-device /
account-backed carts, shipping and tax rework, the membership purchase flow
(Stays on Stripe Payment Links), order-records read paths
([Order records portal + transactional email](https://github.com/Chapster87/pghrugby/issues/67)),
and E2E regression coverage
([Add Playwright end-to-end tests for the ordering / checkout flow](https://github.com/Chapster87/pghrugby/issues/76)).

**Deferred** (in scope, not yet specifiable — see § 13): price drift, add-ons on
a grouped PDP, PDP SEO/structured data, funnel analytics, and the future Donate
any-amount surfacing revision.

---

## 2. Cutover model

**Replace in place, one cutover, no runtime feature flag and no dual-path
coexistence** — detail in `docs/agents/pdp-flow-rollout.md`.

- There is no feature-flag infrastructure; the reshaped `carts` snapshot is not
  readable by the old builder anyway, so a flag would offer no real fallback.
- The site is not live and there is no historical `orders` / `carts` data worth
  preserving, so the schema is reshaped rather than dual-read.
- The old one-shot flow is deleted in the same change that ships the new one.

| Old                                                                   | New                                                |
| --------------------------------------------------------------------- | -------------------------------------------------- |
| `src/app/(core)/product/[slug]/checkout-form.tsx` (one-shot PDP form) | the PDP layout (§ 5)                               |
| `src/app/(core)/cart/page.tsx` dues + donation builder                | the minicart flyout (the only cart surface)        |
| header `Cart` link → `/cart` navigation                               | an in-place flyout trigger carrying the item count |
| `carts.flow` / `carts.registration` / `carts.line_items`              | `carts.entries` (§ 9)                              |

Golf and Steel City 7s pages are rebuilt as PDPs in the same cutover — with the
one-shot form gone there is no fallback for them.

---

## 3. Current state → target

| Touchpoint                                                                | Today                                                                                                                                                                                              | Target                                                                                                                                                                                                   |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/checkout/cart-store.ts`                                          | Server-persisted cart; `CheckoutCartItem { sku, label, unitAmount, quantity }`; cart-level `flow` + `registration`; `MAX_LINE_QUANTITY = 100`; `buildCart` / `saveCart` / `getCart` / `createCart` | Browser-held entry list (React context + `localStorage`); `PricedLine` / `CollectorEntry` union; `sourcePdp` / `groupRef` / `parentId` / `fields` per entry; no cart-level `flow` / `registration` (§ 6) |
| `src/lib/checkout/catalog.ts`                                             | `sku` → `label` / `unitAmount` / `priceId`; `findCatalogItemsForProduct` prefix fallback; `CHECKOUT_MAX_GOLFERS = 8`; two `sc7s-*-additional-side` items                                           | Keeps `sku` → `label` / `unitAmount` + test-mode `price_data` only; live `priceId` comes from DatoCMS; prefix fallback removed; additional-side items removed                                            |
| `src/lib/checkout/record-order.ts`                                        | Flat `OrderRecord` (`flow`, `line_items`, `registration`); `deriveFlow` reads the **first** line item's family                                                                                     | `orders` header + `order_lines` + `order_registrations`; `deriveFamilies` reads distinct families across **all** lines (§ 9)                                                                             |
| `src/app/api/checkout/cart/route.ts`                                      | `POST { pdp, selections, registration? }` → `createCart`, persists a `carts` row                                                                                                                   | Add-time resolve/validate call — prices + `in_stock` + per-line errors, **no persistence** (§ 8.1)                                                                                                       |
| `src/app/api/checkout/sessions/route.ts`                                  | Builds line items from `catalog.ts` `priceId`; `metadata: { flow }`; no discounts                                                                                                                  | Walks priced lines in cart order; DatoCMS price resolution; SC7s coupon step; `families` / `reg_N` / `reg_count` / `reg_ref`; writes the `carts` snapshot (§ 8)                                          |
| `src/app/(core)/product/[slug]/product-detail-page.query.ts` + `page.tsx` | Already reads `primaryProducts` / `addonProducts` / `dataCollectors`; no gallery; product fields only `title` / `sku` / `shortDescription` / `longDescription` / `priceId`                         | Adds `gallery`, `product_type`, `in_stock`, `quantity_bearing`, sale-price fields (§ 4)                                                                                                                  |
| `src/app/(core)/product/[slug]/checkout-form.tsx`                         | Inline radio / checkbox / raw inputs; quantity derived from rows (`rows → quantity`)                                                                                                               | Replaced by the PDP layout (§ 5); `quantity → rows`                                                                                                                                                      |
| `src/app/(core)/cart/page.tsx`                                            | Flow-specific dues + donation builder                                                                                                                                                              | Deleted; `/cart` becomes a thin alias that opens the flyout                                                                                                                                              |
| `src/components/header/main/index.tsx`                                    | Plain `<Link href="/cart">Cart</Link>`                                                                                                                                                             | Cart button with item count that opens the flyout in place                                                                                                                                               |
| `src/app/(checkout)/checkout/success/page.tsx`                            | Renders `order.registration` via `RegistrationDetails`                                                                                                                                             | Renders registration rows grouped by their line (§ 9.4)                                                                                                                                                  |
| `supabase/migrations/`                                                    | `orders` with `flow` / `line_items` / `registration`; `carts` with `flow` / `line_items` / `registration`                                                                                          | Header + child tables, `carts.entries`; legacy columns dropped, no backfill (§ 9.5)                                                                                                                      |
| `scripts/provision-stripe-catalog.mjs`                                    | Products + prices only                                                                                                                                                                             | Also provisions the SC7s per-count coupons + `EXTRASIDE` promotion code (§ 8.3)                                                                                                                          |
| `src/components/`                                                         | `button`, `dialog`, `select`, `checkbox`, `radio-group`, `quantity-selector`, …                                                                                                                    | Adds a Sheet/Drawer wrapper and a cart-line card (§ 5.8)                                                                                                                                                 |

`src/lib/checkout/storefront-catalog.json` is a migration/backfill guide, not
runtime config — it is not imported by `src/`. It needs reconciling (retired
additional sides, donation-preset split) but drives nothing at runtime.

---

## 4. DatoCMS content model

Detail: `docs/agents/datocms-pdp-buckets-migration.md`,
`docs/agents/pdp-product-model.md`, `docs/agents/pdp-pricing-and-sale-windows.md`,
`docs/agents/donate-pdp-preset-selection.md`. **Every field below is live on the
`main` environment** (§ 4.5) — the buckets, gallery, product-type and pricing
fields from the original restructure, then the copy reshape and the tab system,
then the tagline's move to Structured Text.

### 4.1 `product_detail_page`

| Field             | API key             | Type                       | Notes                                                                                                                                         |
| ----------------- | ------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary products  | `primary_products`  | `links` → `product`        | Ordered; `size.min: 1` stands in for required; `fail` cascades                                                                                |
| Add-on products   | `addon_products`    | `links` → `product`        | Ordered; no `size`; `fail` cascades                                                                                                           |
| Data collectors   | `data_collectors`   | `links` → `data_collector` | Ordered; `fail` cascades                                                                                                                      |
| Product type      | `product_type`      | `string` enum              | `simple` \| `variation` \| `grouped`; required, default `simple`, `string_select`; hint-only (not schema-enforced)                            |
| Gallery           | `gallery`           | Modular `rich_text`        | Restricted to `gallery_item_block` (§ 4.2)                                                                                                    |
| Short description | `short_description` | Structured Text, optional  | The tagline under the meta line, above the option selector (§ 5.1). The page owns the tagline — the product model keeps no short copy (§ 4.3) |
| Event starts at   | `event_starts_at`   | `date_time`, optional      | The buy box meta line's date (§ 5.1). Blank on anything that is not a scheduled event                                                         |
| Event location    | `event_location`    | `string`, optional         | The meta line's other half; either half alone still renders the line                                                                          |
| Tabs              | `tabs`              | Modular `rich_text`        | Ordered panels, restricted to `product_tab` (§ 4.7). Content decides what renders and in what form (§ 5.6)                                    |
| —                 | `description`       | —                          | **Dropped.** Its copy is `short_description`                                                                                                  |
| —                 | `page_components`   | —                          | **Dropped.** Superseded by the three buckets                                                                                                  |

Ordering is positional array order. Primary vs add-on is **structural** — it is
which field the editor used, not a `kind` enum.

### 4.2 `gallery_item_block`

Cloudinary Picker JSON, not a native DatoCMS media field (free-tier constraint).
Mirrors `page.featured_image`.

| Field           | Type     | Required | Notes                                             |
| --------------- | -------- | -------- | ------------------------------------------------- |
| `desktop_media` | `json`   | yes      | Cloudinary Picker; `featured_image`-shaped object |
| `mobile_media`  | `json`   | no       | Art-directed crop; falls back to desktop          |
| `alt`           | `string` | no       | The Cloudinary object carries no alt text         |

- Renderer selects per breakpoint (`<picture>` / media query) and branches on the
  object's `resource_type` (`image` → `next/image` / `CloudinaryImageRenderer`;
  `video` → `<video>` with the Cloudinary URL). `duration` is in the object.
- No uploads are created in DatoCMS, so nothing counts against free-tier media
  limits. Native `responsiveImage` / srcset / blur-up does not apply.
- Draft/preview is per-record and already wired; the gallery needs no
  gallery-specific plumbing. Visual editing for `json`/modular fields is a
  separate, still-open concern (Stega covers text fields only).

### 4.3 `product` model fields

| Field              | Type                 | Notes                                                                                                                                     |
| ------------------ | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `description`      | `text`               | The product's full copy. Renamed from `long_description`; also the fallback body for a Description-typed tab with none of its own (§ 5.6) |
| `in_stock`         | `boolean`            | Default `true`. Drives the PDP "Sold out" display and the server-side availability check                                                  |
| `quantity_bearing` | `boolean`            | Default `false`. Whether a line renders a quantity control; orthogonal to `product_type`                                                  |
| `price_id`         | `string`             | The **authoritative** regular Stripe Price id                                                                                             |
| `sale_price_id`    | `string`, optional   | The sale / early-bird Stripe Price id                                                                                                     |
| `sale_starts_at`   | `datetime`, optional | Single sale window start (club-local, `America/New_York`)                                                                                 |
| `sale_ends_at`     | `datetime`, optional | Single sale window end                                                                                                                    |

**Copy reshape** ([#120](https://github.com/Chapster87/pghrugby/issues/120),
2026-09-24). The product model holds **one** copy field. `description` is
`long_description` renamed, so its values come across untouched;
`short_description` is **dropped**. The drop is the considered part: the field was
populated per _variant_ — one line per Steel City 7s division, one per dues
season — while the page's replacement is a single string, so there was no
faithful destination for it. What it uniquely carried is already on the row: the
catalog `label` names the variant, and the line's price is rendered beside it.

**Verified against the live CDA** (2026-09-24, before the migration was run). 11
of 20 products carry short copy: the three dues seasons, the five live SC7s
divisions, the two retired additional sides, and two records that are legacy
migration fallout — `golf-outing-registration` (a PayPal-outage notice) and
`donation-club` (a donation appeal with a pasted PayPal button script inside it).
Both currently render as the line's `note`, so broken JavaScript and a wall of
text reach the DOM on the golf and donate PDPs today; dropping the field ends
that. Whether the _notice_ in them is still operationally wanted is a content
question, recorded on #120 — it is not an argument for keeping the field.

The tagline is a **move, not authoring**: all eight PDPs already carry good
flow-level intro copy in the page's `description`, which becomes
`short_description` unchanged. Two alternatives to the drop were rejected: keeping
the field under an honest product-level name (`option_note`), which contradicts
"one copy field on `product`"; and hoisting six divisions' worth of strings into
one page string.

**Price resolution** (server-side, at cart build and at session creation; read on
the PDP for display):

```
effectivePriceId =
  now ∈ [sale_starts_at, sale_ends_at] && sale_price_id ? sale_price_id : price_id
```

A single window, not a repeatable schedule — it can grow into a block later.
There is **no Stripe-native price scheduler**; the window lives in DatoCMS where
the owner already edits content.

### 4.4 Page classification

| Page                      | `product_type` | Notes                                                                                                            |
| ------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------- |
| Forge Pig Roast           | `simple`       | one ticket                                                                                                       |
| Steel City 7s Bar Crawl   | `simple`       | one ticket                                                                                                       |
| Golf Outing               | `simple`       | one registration primary (`quantity_bearing`, buyer-set 1–4); mulligan / drink band are quantity-bearing add-ons |
| Dues                      | `variation`    | fall / spring / summer alternatives                                                                              |
| Donate                    | `variation`    | three club presets + pass-the-hat (cart primaries only)                                                          |
| Steel City 7s             | `variation`    | five divisions are alternatives; **no add-ons**                                                                  |
| Forge Day at the Ballpark | `grouped`      | adult + 16 & under, each with its own quantity                                                                   |
| NFL Survivor Pool         | `grouped`      | ticket + insurance, each with its own quantity                                                                   |

### 4.5 Applied state (already live)

From [Task: Bootstrap the DatoCMS CLI and apply the PDP schema migration](https://github.com/Chapster87/pghrugby/issues/68)
and [Task: Realign golf registration with the cart-line model](https://github.com/Chapster87/pghrugby/issues/74):

- DatoCMS project "Forge Website", `site-id 204985`, single primary environment
  `main`. `datocms.config.json` sets `apiTokenEnvName: "DATOCMS_CMA_TOKEN"`,
  `migrations.directory: "./migrations"`, `modelApiKey: "schema_migration"`.
- Migrations `migrations/1789241551_pdpAddBucketsAndGallery.ts` and
  `migrations/1789241570_pdpDropPageComponents.ts` were forked, verified, and
  promoted; commit `01d15de` is what landed them plus the app query switch.
  `page_components` is gone; the four live PDPs are backfilled.
- Golf realignment (commit `c52f600`): `golf-outing-registration` is
  `quantity_bearing: true`; the collector's repeatable `golfers` field is capped
  at `max: 3` (remaining players; the captain is player 1).
- **Credential caveat:** `.env.local`'s `DATOCMS_CMA_TOKEN` cannot write. Live
  record edits required the linked `datocms` CLI with owner OAuth.
- **Applied 2026-09-25** ([#120](https://github.com/Chapster87/pghrugby/issues/120)):
  `migrations/1790305040_reshapeProductCopyAndAddTabs.ts` was run on a fork of
  `main`, verified there, and promoted — the copy reshape and the tab system land
  together with the app change, because the promote drops fields `trunk` still
  read. `migrations/1790313304_addRichPageTagline.ts` and
  `migrations/1790313305_swapPageTaglineToRich.ts` then ran **in place** on the
  primary (`--allow-primary`): a field's type cannot be changed in DatoCMS, so the
  tagline's move to Structured Text is create → convert → drop → rename, split so
  the additive half is separate from the lossy one.
- **The rollback is the `main-pre-reshape` sandbox**, left in place by the promote:
  the substrate is forward-only, so a snapshot of the pre-reshape schema and content
  is the only way back. Do not destroy it casually.

### 4.6 Orphan event PDPs (the simple case)

[Task: Author PDPs for the four orphan event products](https://github.com/Chapster87/pghrugby/issues/65)
authored the four events through the new format and published them on `main`
(2026-09-13): `pig-roast` / `bar-crawl` (`simple`), `ballpark` /
`survivor-pool` (`grouped`). The six event `product` records became
`quantity_bearing: true`, and the four clean URLs are registered in
`src/lib/checkout/storefront-catalog.json` `flows`, which drives the
`next.config.js` rewrites. Intro copy is a first draft and galleries are empty
— both owner follow-ups; detail in the ticket.

### 4.7 `product_tab`

The panel set is authored, not fixed ([#120](https://github.com/Chapster87/pghrugby/issues/120)).
One block per panel, on the page's ordered `tabs` field (§ 4.1) — the same
arrangement `gallery` has with `gallery_item_block` (§ 4.2).

| Field     | Type            | Required | Notes                                                                                          |
| --------- | --------------- | -------- | ---------------------------------------------------------------------------------------------- |
| `tab`     | `string` enum   | yes      | `description` \| `includes` \| `goodToKnow` \| `other`; `string_select`, default `description` |
| `title`   | `string`        | yes      | The tab's visible label. Setting a title is what makes the panel appear                        |
| `content` | Structured Text | no       | The panel body, carrying the same embeds a page body accepts                                   |

`tab` has exactly **one** functional role: it marks the Description-typed tab,
the one whose panel falls back to the primary product's `description` when it has
no `content` of its own (§ 5.6). Every other value is a filing aid for the editor.
Since `title` is what the reader sees, a panel is never forced to fit one of the
four names — `other` plus a title covers whatever the club adds next, and nothing
here has to be re-migrated to add a fifth panel.

`content` is Structured Text rather than a plain `text` field so a panel can carry
images and video, rendered by the same `StructuredText` + `renderBlock` switch the
page bodies use. Its allow-lists mirror the page body's own Structured Text
field: the shared embed blocks, and record links to `page` only. Stega covers
text fields alone, so visual editing does not reach this field or `tabs` any more
than it reaches `gallery` (§ 4.2).

---

## 5. PDP render

Detail: `docs/agents/pdp-layout-direction.md`,
`docs/agents/pdp-product-model.md`.

### 5.1 Layout (direction B — side-by-side)

Desktop: two columns above the fold. Mobile: single column, gallery above the
buy box. The club does not expect strong enough imagery to carry a large hero,
so the gallery sits beside the buy box.

- **Left column** — the page gallery as a one-at-a-time carousel: icon-only
  Lucide `ChevronLeft` / `ChevronRight` nav (44px touch targets), position dots
  over the image (30px target around a 10px visible dot). Gallery items select
  the mobile/desktop variant and branch image vs video (§ 4.2).
- **Right column** — the buy box, in order:
  1. title
  2. the event meta line — the date and location from `event_starts_at` /
     `event_location` (§ 4.1), directly under the title. Rendered only when at
     least one of the two is set, so a page that is not a scheduled event shows
     nothing here
  3. short description — the page's `short_description`, Structured Text
     restricted to links and emphasis (§ 4.1), rendered as its own paragraph
  4. "Read the full description" anchor — smooth-scrolls to the panel below the
     fold; a real `#` anchor with a JS enhancement honouring
     `prefers-reduced-motion`, and when the content renders as tabs it also
     selects the Description tab (§ 5.6)
  5. option selector (§ 5.2)
  6. add-ons (§ 5.3)
  7. DataCollector (above the add-to-cart, § 5.4)
  8. running total
  9. **one** add-to-cart button

### 5.2 Option selector (per `product_type`)

- `simple` — the one primary renders as a **price card** (name + price in a
  white bordered block), with a quantity stepper only when `quantity_bearing`.
- `variation` — a Radix Select with **no preselection** and sold-out options
  disabled; selecting an option renders the same price card below the dropdown.
- `grouped` — a multi-select of primaries; every selected primary renders its own
  price card with its own stepper; one "add all" action. Grouped pages with
  add-ons are deferred (§ 13). The price card is a mechanical extension of the
  simple/variation treatment.

### 5.3 Add-ons

Optional checkbox rows, each showing its price and a stepper when
`quantity_bearing`. Sold-out add-ons render **disabled and labelled "Sold out"
— never hidden**.

### 5.4 DataCollector

Rendered in the buy box above the add-to-cart. Fields come from the collector's
`formFields`; repeatable rows mirror the line quantity (**`quantity → rows`**).
For golf the captain is player 1 and the repeatable player field collects the
remaining 1–3 (`max` = quantity − 1). A mismatch between answers and quantity is
a UI warning only — it never blocks checkout.

### 5.5 Availability

`in_stock: false` renders the line but **disables** it and labels it "Sold out"
— never hides it. Editorial copy and the gallery stay readable. If no primary is
available, replace the add-to-cart control with an unavailable / registration-
closed state. The same rule covers add-ons and grouped pages. Enforcement is
server-side (§ 8.2) — the flag is not editorial-only.

### 5.6 Bottom panel

Below the fold the panel set is **authored**, and content decides the form. The
page's `tabs` field holds one `product_tab` block per panel (§ 4.7), in order;
the renderer enumerates that field rather than naming panels of its own, so a new
panel needs no code and an empty one cannot render.

- **Nothing to show → nothing rendered.** `title` is required on the block and is
  the tab's label, so what decides whether a panel renders is content, not title: a
  tab whose panel would be empty — no `content`, and not a Description tab with a
  product `description` to fall back on — does not appear at all, its title
  alongside it.
- **One populated panel → a plain section** with its heading. A single tab is a
  control with nothing to control, so it is not given a tab strip.
- **Two or more → the `tabs` wrapper** (§ 5.8), labelled from each block's
  `title`, in the order they are dragged.
- **Description is the one tab with a fallback.** When its own `content` is
  empty the panel renders the primary product's `description` (§ 4.3) beneath the
  tab's title. That is what keeps every live PDP showing a description panel
  without the copy being maintained twice.
- **No authored tabs at all → one implicit Description panel.** A page whose
  `tabs` is empty and whose primary product carries a `description` renders that
  copy as a single Description section, titled "Description". Every PDP predates
  the tab system, and each showed its product copy below the fold before it
  existed — without this rule, moving the panel set into the CMS would have
  silently deleted a description from all eight. Authoring any tab takes over:
  the implicit panel is only what stands in for "nothing authored yet".
- The full-description anchor (§ 5.1) scrolls here, and selects the Description
  tab when the panels render as tabs.

### 5.7 Quantity control

The shared `QuantitySelector` is restyled to match the global field controls
(white, `1px #ccc`, `4px` radius, `1rem`) with 32px buttons and 16px Lucide
`Minus` / `Plus` icons. Any quantity-bearing line uses it. Consume it directly —
do **not** pass a `className`, which overrides its own root class through its
props spread.

### 5.8 Controls and global wrappers

Prefer Radix primitives, wrapped **once** as global components. Already present:
`button`, `dialog`, `select`, `checkbox`, `radio-group`, `quantity-selector`.
To add: a **Sheet/Drawer** wrapper around `@components/dialog`, a **cart-line
card** component (shared by the flyout, the future `/cart`, and order summaries),
and a **`tabs`** wrapper (`@components/tabs`) for the PDP's below-fold panel set
(§ 5.6).

### 5.9 Add-to-cart handoff

"Add to cart" commits a **fully specified** line: the primary priced line, its
add-on priced lines, and one collector entry carrying `answers` plus a `fields`
snapshot — all sharing a `groupRef`. The flyout then opens (§ 7).

### 5.10 Draft / preview parity

The PDP query threads `includeDrafts: draftMode().isEnabled` and
`baseEditingUrl: true`, matching every other page. Caveat: a draft PDP can
reference a not-yet-live Stripe price; draft preview must not create a chargeable
session against an unreleased price. Treat this as an authoring/validation
concern, not a cutover blocker.

---

## 6. Cart model

Detail: `docs/agents/cart-line-model.md`,
`docs/agents/registration-editing.md`.

### 6.1 The cart is browser-held

Client state (React context + `localStorage`). The server stays authoritative on
price. The `cartRef` (uuid) is held with the entries and used as
`client_reference_id`. The Supabase `carts` row is the **checkout snapshot
only**, written at session build (§ 8.1).

One browser-held cart holds entries from any PDP — a golf registration, a pig
roast ticket, and a dues payment coexist. `sourcePdp` is a reporting tag only
and never drives building.

### 6.2 Entry shapes

```
CartEntry =
  | PricedLine      { id, kind: "product",   sku, quantity, sourcePdp, groupRef, parentId? }
  | CollectorEntry  { id, kind: "collector", collectorRef, answers, fields,
                      sourcePdp, groupRef, parentId }
```

- `id` — stable client-generated uuid, assigned at add-time.
- `sourcePdp` — the PDP slug the entry was added from; replaces the cart-level
  `flow` slug. Reporting only.
- `groupRef` — the add-to-cart action that created the entry; a UI/provenance
  tag, **not** an identity key.
- `parentId` — on an add-on `PricedLine` or on a `CollectorEntry`: the `id` of
  the primary `PricedLine` it was added with.
- `collectorRef` — the DatoCMS `data_collector` record id.
- `answers` — the DataCollector payload, keyed by field name.
- `fields` — a **snapshot of the collector's field definitions at add-time**
  (label, type, options, required, repeatable/max). This keeps the cart
  client-only (no CDA token in the browser, no extra fetch route) and means a
  collector edited in DatoCMS after an add does not retroactively reshape an
  existing line's edit surface.

Only a `PricedLine` is commercial: one sku, a buyer-set quantity, and the **only
kind that becomes a Stripe line item**. A `CollectorEntry` renders and behaves
like a line but carries no sku and no price. Add-ons are ordinary priced lines;
there is **no nesting** — a primary, its add-ons, and its collector entry form a
group through `parentId`.

### 6.3 Identity and merging

| Entry                                                                       | Merge key         | Behaviour                                                            |
| --------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------- |
| Registration-bearing priced line (a `CollectorEntry.parentId` points at it) | —                 | **Never merges.** Every add is a new line + a new collector entry    |
| Add-on priced line (`parentId` set)                                         | `(sku, parentId)` | Merges with a same-sku add-on under the same primary; quantities sum |
| Plain priced line (no collector entry, no `parentId`)                       | `sku`             | Merges by sku; quantities sum                                        |
| Collector entry                                                             | —                 | **Never merges.** One per add                                        |

When two plain lines merge, any entry whose `parentId` points at the retired
line is re-pointed at the survivor, so add-ons follow their primary. The same
sku may appear on several lines at once — two golf registrations are two lines.

### 6.4 Association, removal, quantity

- Removing a primary **cascades**: its add-ons and its collector entry go with
  it. Removing a single add-on removes only that line. A collector entry cannot
  be removed or edited on its own.
- A primary's quantity stepper floors at 1; leaving the cart is an explicit
  remove (which cascades).
- Quantity is buyer-set and never derived from the DataCollector. The server
  clamps every line to 1–100 (`MAX_LINE_QUANTITY`).
- On a registration-bearing line, **`quantity → rows`**: the collector's
  repeatable rows mirror the line quantity. Golf is 1–4 (one foursome per
  registration); the captain is player 1.

### 6.5 What the flyout can change

| Entry                                               | Editable in the flyout                      | Fixed at add-time                              |
| --------------------------------------------------- | ------------------------------------------- | ---------------------------------------------- |
| Priced line, `quantity_bearing`, no collector entry | quantity, remove                            | —                                              |
| Priced line with a collector entry (golf, SC7s)     | **edit** (opens the collector form), remove | — (the edit surface owns quantity and answers) |
| Add-on priced line                                  | quantity, remove (independent)              | —                                              |
| Collector entry                                     | nothing on its own                          | answers; removed only by cascade               |

Registration-backed lines offer **no stepper** in the flyout — the edit surface
owns quantity (§ 7.4).

---

## 7. Minicart flyout

Detail: `docs/agents/minicart-flyout-direction.md`,
`docs/agents/registration-editing.md`.

### 7.1 Direction — grouped cards

One bordered card per add-to-cart action (variant B). "Tight ledger" and
"Editorial full-bleed" were prototyped and dropped.

### 7.2 Shell

One Radix Dialog with `view: cart | edit`:

- **Desktop** — right-hand drawer, full height, `min(420px, 100vw)`.
- **Mobile** — bottom sheet, `max-height: 88vh`, rounded top corners.
- Animations are **plain CSS** on Radix's `data-state` and on mount: the drawer /
  sheet slides in from its edge; the cart list and edit panel swap inside the
  same Dialog by always entering from the right. `prefers-reduced-motion`
  disables all of it. No animation library.

Opens on add-to-cart and from the header cart button. Closes on Esc, backdrop
click, and Close — Radix's focus-trapped Dialog behaviour.

### 7.3 The card

Cards group top-level priced lines by `groupRef` (a display tag, never an
identity key).

- **Card header** — the source PDP label and the group total.
- **Primary line** — thumbnail, name/note, quantity rail, price.
- **Registration answers** — the snapshotted `fields` + `answers` rendered as a
  labelled definition list.
- **Add-ons** — an indented set under a dashed divider, each with its own
  quantity and remove.
- **Actions** — `Edit` (registration lines only) and `Remove`, below the line.

Line alignment: the **quantity control sits top-right** with the **extended
price directly beneath** on a right-aligned rail. Lines whose quantity is locked
in the flyout show **`Qty. N`** instead of a stepper. Edit wears a pencil icon,
Remove a trash icon with red text; equal-height buttons. On an add-on, Remove
sits directly beneath the add-on name with the qty/price rail to its right. The
quantity control is the shared global `QuantitySelector` (§ 5.7).

Thumbnails come from Stripe product images (`Product.images[0]`, resolved via a
`price.product` expand) through `src/lib/checkout/product-image.ts`
(`getLineThumbnailUrl`, cached per Price), falling back to
`FALLBACK_PRODUCT_IMAGE` when a product has no image. `files.stripe.com` is
allow-listed in `next.config.js` `images.remotePatterns`. Live-side detail:
`docs/agents/stripe-checkout-registration-metadata.md`.

### 7.4 Edit panel

Choosing Edit swaps the same `Dialog.Content` to the collector form — **not** a
nested Dialog: one focus scope, one dismiss contract. Focus lands on the first
field and returns to the Edit control on Back/Cancel/Save. The surface mutates
the `CollectorEntry.answers` and the primary `PricedLine.quantity` **together**;
the entry keeps its `id` / `parentId`, add-ons survive, and cart order is stable.
Increasing quantity appends empty rows; decreasing drops trailing rows, warning
before discarding a named row. Save enforces add-time rules; Cancel discards
everything. An empty player row stays allowed.

### 7.5 Footer, empty state, header

- Footer: `Subtotal` and a full-width **Checkout** CTA.
- Empty: a dashed placeholder card and a "Keep browsing" action.
- The header `Cart` control becomes a **button that opens the flyout in place**
  (no navigation) and carries the item count.
- `/cart` survives as a thin **alias route that opens the flyout on arrival** —
  a canonical URL for return pages and future external links. It holds no
  cart-building UI.

---

## 8. Checkout session build (server)

Detail: `docs/agents/pdp-pricing-and-sale-windows.md`,
`docs/agents/pdp-product-model.md`, `docs/agents/sc7s-additional-side-pricing.md`,
`docs/agents/donations-in-mixed-carts.md`,
`docs/agents/order-records-and-reporting.md`.

### 8.1 Data flow

1. **Add-time resolve/validate** — `POST /api/checkout/cart` takes the proposed
   entries (or the add), resolves each sku to its DatoCMS `product` record, and
   returns quoted unit amounts + `in_stock`. A sold-out line is refused so it
   never enters the cart. This call **does not persist**.
2. **Session build** — `POST /api/checkout/sessions` receives the browser-held
   entries, re-resolves prices and availability **fresh**, writes the `carts`
   snapshot row (`entries`, server-computed `total`), and creates the Checkout
   Session.

The snapshot is what `recordOrder` reads back in the webhook, since the webhook
has no cart entries. One CDA query resolves the cart's skus to `product` records
(both `in_stock` and the price fields), cache-tagged.

### 8.2 Line items, price, availability

- Walk the **priced lines only, in cart order**; each becomes one Stripe line
  item. Collector entries never become line items.
- Each line's `price` is `effectivePriceId` resolved per § 4.3. Live mode
  requires a `priceId`; test mode falls back to inline `price_data` from
  `catalog.ts` `unitAmount`.
- Re-validate every line against DatoCMS `in_stock`. On failure, **block the
  session and return per-line errors**; the buyer removes the sold-out line and
  retries. Never auto-drop lines (the total must never silently differ from what
  was shown) and never block the whole cart — a mixed cart may hold valid lines
  beside one sold-out division.

### 8.3 SC7s additional-side coupon

The additional side is a **gender-neutral discount**, not a product; the
`sc7s-*-additional-side` products are retired.

- The server counts SC7s registration lines; extras = count − 1. If extras ≥ 1 it
  applies the matching per-count coupon (`sc7s-extra-1` $25, `sc7s-extra-2` $50,
  …) automatically.
- For a returning buyer, the promotion code `EXTRASIDE` maps to `sc7s-extra-1`;
  the server validates it against the Stripe promotion codes API and passes
  `discounts: [{ promotion_code }]`.
- Checkout allows only **one** coupon/promotion code per session. If the cart
  already qualifies automatically, an entered code is **not** applied on top.
- Coupons and the promotion code are provisioned by extending
  `scripts/provision-stripe-catalog.mjs`; `catalog.ts` drops the two
  additional-side items and their `priceId`s.

### 8.4 Donations

- Fixed presets are ordinary cart lines: plain `PricedLine`, no collector entry,
  `quantity_bearing: false` (`Qty. 1`), merge by sku, `family=donation`.
- `submit_type`: `'pay'` whenever a real product rides along; `'donate'` only on
  a donation-only session.
- The preset ladder is `donation-club` $10 / $25 / $50 plus
  `donation-pass-the-hat` $1 (the `donation-club-preset-10` / `-25` / `-50`
  records — § 4, `docs/agents/donate-pdp-preset-selection.md`).
- A true pay-what-you-want donation is a **standalone sole-line session**: a
  `custom_unit_amount` Price (preset $50 / min $1 / max $10,000) referenced by a
  dedicated standalone page field on the Donate PDP to the `donation-club`
  record (sku `donation-club-any`). It never enters the cart, and it forbids
  discounts, so it cannot ride a mixed or discounted session. It **still
  proceeds** when the cart is non-empty; the browser cart is untouched and the
  control states plainly that it is a separate payment.

### 8.5 Stripe metadata

Written to session `metadata` **and** `payment_intent_data.metadata` (the
Dashboard payment page is the PaymentIntent):

| Key         | Value                                                                                                                                                                              |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `families`  | distinct families joined, e.g. `"golf,dues,donation"` — replaces `flow`                                                                                                            |
| `reg_N`     | one per priced line at position `N` (= `line_index`); a non-registration line inherits its primary's registrants via `parentId`; a line with no primary (dues, donation) gets none |
| `reg_count` | number of registrations in the order                                                                                                                                               |
| `reg_ref`   | the `client_reference_id` (cartRef) — the trace-back key into `orders` → child rows                                                                                                |

The `reg_N` value is a compact human string (`"Golf Reg x4: Jane Smith, …"`),
capped at 500 chars with a `… +N more` marker; the untruncated payload lives in
`orders`. Limits are inherited, not re-opened: 50 keys per object, key ≤ 40
chars, value ≤ 500 chars, no `[`/`]` in keys. A >50-line cart overflows into
`line_items[].metadata`.

---

## 9. Order records

Detail: `docs/agents/order-records-and-reporting.md`.
**No historical data to preserve — the migration drops and recreates, no
backfill.**

### 9.1 `orders` (header)

```
orders (
  session_id          text primary key,          -- Stripe Checkout Session id (cs_...)
  client_reference_id text,                      -- cartRef; null for cartless orders
  currency            text not null,
  amount_total        bigint not null,           -- cents
  amount_tax          bigint,
  payment_status      text,                      -- paid | unpaid | no_payment_required | processing
  session_status      text,                      -- open | complete | expired
  payment_intent_id   text,                      -- refund reconciliation key (kept)
  refunded_amount     bigint not null default 0, -- kept
  refund_status       text not null default 'none', -- kept
  customer_email      text,
  customer_name       text,
  shipping            jsonb,
  families            text[] not null default '{}', -- replaces `flow`
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
)
-- dropped: flow, line_items, registration
```

Keep the existing indexes on `client_reference_id` and `created_at desc`.

### 9.2 `order_lines`

```
order_lines (
  id             text primary key,      -- `${session_id}:${line_index}` (deterministic)
  session_id     text not null references orders(session_id),
  line_index     integer not null,      -- 0-based over priced lines
  unique (session_id, line_index),
  sku            text,                  -- Stripe product id (price.product.id), as today
  description    text,
  quantity       integer not null,
  unit_amount    bigint,                -- cents
  amount_total   bigint not null,       -- cents
  family         text,                  -- price.product.metadata.family; null when none
  source_pdp     text,                  -- from the cart entry; null for cartless orders
  parent_line_id text references order_lines(id) -- null; an add-on's primary line
)
```

`line_index` is the join key shared with the `reg_N` metadata scheme. Insert
primaries before add-ons so the self-reference resolves.

### 9.3 `order_registrations`

```
order_registrations (
  id            text primary key,  -- `${session_id}:${line_index}` of its primary line
  session_id    text not null references orders(session_id),
  line_id       text not null unique references order_lines(id),
  collector_ref text,              -- DatoCMS data_collector record id
  fields        jsonb,             -- add-time field-definition snapshot (§ 6.2)
  answers       jsonb,             -- raw payload (captainName, golfers[], teamName, …)
  summary       text,              -- the human string that rides in reg_N
  source_pdp    text
)
```

A line bears **at most one** registration (`unique (line_id)`). Both `answers`
and `fields` are persisted, so a future per-person / per-team derivation is a
query, not a re-migration. `family` is `text`, not a Postgres enum, so adding a
family later is a metadata change + backfill, never a schema migration.

### 9.4 `carts` (checkout snapshot)

```
carts (
  cart_ref   text primary key,
  currency   text not null,
  entries    jsonb not null,   -- the flat cart entry list, verbatim
  total      bigint not null,  -- server-computed display snapshot
  created_at timestamptz not null default now()
)
-- dropped: flow, line_items, registration
```

No resolved amounts on the snapshot: prices are re-resolved at session build,
and `order_lines.unit_amount` comes from the Stripe session. `carts` is
transient; retention/pruning is delegated to
[Order records portal + transactional email](https://github.com/Chapster87/pghrugby/issues/67).

### 9.5 Migration and code changes

- One Supabase migration: drop the legacy columns, add `order_lines` /
  `order_registrations` / `carts.entries`. New tables are RLS-enabled with zero
  policies, service-role only — same as `orders` / `carts`.
- Rewrite `src/lib/checkout/record-order.ts`: `OrderRecord` becomes the header
  shape; `recordOrder` walks the Stripe session's line items
  (`expand: ['line_items', 'payment_intent']`) and the `carts` snapshot to write
  the header + child rows. Deterministic ids plus `insert … on conflict do
nothing` preserve the first-writer-wins contract the webhook + success-page
  race depends on.
- `deriveFlow` (first line item's family) is replaced by
  `deriveFamilies(session)` — the distinct `price.product.metadata.family`
  across all lines. `'{}'` means none known (an orphan-only order, or a product
  with no family metadata). The five canonical families stay
  `membership | dues | golf | tournament | donation`; the four one-off
  fundraisers keep `family = null` and are reported by sku/product. No sixth
  family is invented.
- `/checkout/success` renders the registration **rows grouped by their line**
  instead of the single `order.registration` blob.

---

## 10. Rollout

Detail: `docs/agents/pdp-flow-rollout.md`.

1. Apply the Supabase reshape (`carts.entries`; the `orders` header plus
   `order_lines` / `order_registrations`; `orders.flow` → `families`).
2. Retire the `sc7s-*-additional-side` Stripe products in the same window.
3. Deploy the new flow.

**Content gate:** all four orphan event PDPs are authored before the cutover
(§ 4.6).

**Gate:** a manual end-to-end pass on a preview deploy — a real **mixed** cart
(golf registration + add-on + a dues line + a preset donation) through PDP →
flyout → edit → checkout → success, asserting the `orders` header, child rows,
and `families` land correctly. A thin automated smoke check may back it up but
does not replace it.

**Rollback** = revert the deploy and the migrations — safe because `carts` are
ephemeral snapshots and nothing is live.

**Prototypes:** the two flow prototypes
(`src/app/(core)/workbench/_demos/pdp-layout`,
`.../_demos/minicart-flyout`) are deleted once the real PDP and flyout ship.
`/workbench` stays as the shelf for global component wrappers; temporary flow
prototypes do not belong in it.

---

## 11. Build order

1. **Server data contracts** — `catalog.ts` cleanup (drop additional sides,
   prefix fallback), the DatoCMS sku-resolution query, `cart-store.ts` entry
   types, `record-order.ts` rewrite.
2. **Supabase migration** — the order/cart reshape (§ 9.5).
3. **Checkout API** — `POST /api/checkout/cart` resolve/validate;
   `POST /api/checkout/sessions` price + availability + coupon + metadata +
   snapshot write.
4. **Global components** — Sheet/Drawer wrapper, cart-line card, `tabs` wrapper,
   `QuantitySelector` restyle.
5. **Cart store (client)** — React context + `localStorage`, `cartRef`, entry
   mutations, merge/cascade rules.
6. **Minicart flyout** — shell, grouped cards, edit panel, header trigger,
   `/cart` alias.
7. **PDP render** — gallery, option selector per type, add-ons, DataCollector
   (`quantity → rows`), availability, the authored panel set (§ 5.6), add-to-cart
   handoff.
8. **SC7s pricing** — coupon/promotion-code provisioning and the session step.
9. **Donate** — preset records, standalone any-amount field + sole-line session.
10. **Success page** — registration rows grouped by line.
11. **Cutover** — deletions, content gate, mixed-cart gate, rollback rehearsal.

Both content-gate siblings are now resolved: [Task: Author PDPs for the four orphan event products](https://github.com/Chapster87/pghrugby/issues/65)
authored the orphan PDPs, and [Task: Stripe product photos for cart line thumbnails](https://github.com/Chapster87/pghrugby/issues/64)
settled that thumbnails read Stripe product images with a fallback — no Stripe
image population is needed.

Step 7 additionally waits on the DatoCMS reshape
([Task: Reshape product copy and add the authored PDP tab
system](https://github.com/Chapster87/pghrugby/issues/120)): `product.description`
from the renamed `long_description`, the page's `short_description`, the
`product_tab` block and the `tabs` field, and the two meta fields. The docs and
the migration are authored there; the promotion is the owner's, and the checked-in
`schema.graphql` cannot select the new fields until it is regenerated (§ 4.5).

---

## 12. Decision index

| Decision                                                                                                                                        | Doc                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| [Research: Stripe metadata + product-image mechanics for registration responses](https://github.com/Chapster87/pghrugby/issues/55)              | `docs/agents/stripe-checkout-registration-metadata.md` |
| [Research: DatoCMS migration to three PDP buckets + gallery](https://github.com/Chapster87/pghrugby/issues/56)                                  | `docs/agents/datocms-pdp-buckets-migration.md`         |
| [Grilling: Cart line model (add-ons, merging, quantities, edits)](https://github.com/Chapster87/pghrugby/issues/57)                             | `docs/agents/cart-line-model.md`                       |
| [Grilling: Editing a registration already in the cart](https://github.com/Chapster87/pghrugby/issues/58)                                        | `docs/agents/registration-editing.md`                  |
| [Grilling: Donations in a mixed cart (PWYW constraint)](https://github.com/Chapster87/pghrugby/issues/59)                                       | `docs/agents/donations-in-mixed-carts.md`              |
| [Grilling: Orders + reporting shape for mixed carts](https://github.com/Chapster87/pghrugby/issues/60)                                          | `docs/agents/order-records-and-reporting.md`           |
| [Grilling: Rollout of the new PDP to minicart to checkout flow](https://github.com/Chapster87/pghrugby/issues/61)                               | `docs/agents/pdp-flow-rollout.md`                      |
| [Prototype: PDP layout directions](https://github.com/Chapster87/pghrugby/issues/62)                                                            | `docs/agents/pdp-layout-direction.md`                  |
| [Prototype: Minicart flyout](https://github.com/Chapster87/pghrugby/issues/63)                                                                  | `docs/agents/minicart-flyout-direction.md`             |
| [Task: Bootstrap the DatoCMS CLI and apply the PDP schema migration](https://github.com/Chapster87/pghrugby/issues/68)                          | § 4.5 (applied state)                                  |
| [Grilling: PDP product model - product_type (variation/grouped), per-line quantity, in-stock](https://github.com/Chapster87/pghrugby/issues/69) | `docs/agents/pdp-product-model.md`                     |
| [Grilling: Steel City 7s additional-side pricing](https://github.com/Chapster87/pghrugby/issues/71)                                             | `docs/agents/sc7s-additional-side-pricing.md`          |
| [Grilling: Scheduled sale / early-bird pricing](https://github.com/Chapster87/pghrugby/issues/72)                                               | `docs/agents/pdp-pricing-and-sale-windows.md`          |
| [Task: Realign golf registration with the cart-line model](https://github.com/Chapster87/pghrugby/issues/74)                                    | § 4.5 (applied state)                                  |
| [Grilling: Donate PDP preset selection under the single-price product model](https://github.com/Chapster87/pghrugby/issues/75)                  | `docs/agents/donate-pdp-preset-selection.md`           |
| [Task: Reshape product copy and add the authored PDP tab system](https://github.com/Chapster87/pghrugby/issues/120)                             | § 4.1, § 4.3, § 4.7 (supersedes #117)                  |

Related foundations: `docs/agents/stripe-embedded-checkout-capabilities.md`,
`docs/agents/stripe-catalog-spec.md`, `docs/agents/stripe-catalog-approval.md`.

---

## 13. Deferred / not yet specified

Carried from the map's _Not yet specified_ — in scope, not sharp enough to
build from, and nothing here forecloses them:

- **Price drift** between add-to-cart and checkout — the effective price is
  re-resolved server-side at session creation.
- **Add-on attachment on a `grouped` PDP** — no single primary to hang an add-on
  from; no live product has one.
- **PDP SEO / structured data** with galleries.
- **Funnel analytics** (add-to-cart → cart-open → checkout-start).
- **Donate any-amount surfacing** — the owner foresees replacing the in-page
  standalone CTA with a link below the dropdown to its own page.

Two gaps have left this list. The PDP's panel set beyond Description — and the
§ 5.1 date / location meta line, which turned out to be the same gap — are now
authored content: `product_tab` blocks on the `tabs` field (§ 4.7, § 5.6), plus
`event_starts_at` / `event_location` (§ 4.1). Delivered by
[Task: Reshape product copy and add the authored PDP tab
system](https://github.com/Chapster87/pghrugby/issues/120), which superseded
[#117](https://github.com/Chapster87/pghrugby/issues/117).
