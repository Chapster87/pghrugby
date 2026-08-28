# PROTOTYPE — DatoCMS product & taxonomy models

**Question** (wayfinder ticket: _Prototype: DatoCMS product and taxonomy models_):

> How should DatoCMS model products (editorial content keyed to Stripe prices) plus the flow-group taxonomy for the catalog UI, as the interim home for product content?

This prototype answers it with concrete, runnable model definitions and GraphQL — not prose. It is **throwaway**: once the decision is made, the winning shapes move into a `datocms` CLI migration (or a `datocms-cma` script) and this folder gets deleted.

## Start here: REVIEW.md

`REVIEW.md` is the review artifact — the models as field tables, the real catalog cases as example records, the GraphQL, and the **three decisions** needing your answer (A / B / change it). Read that first; the TUI below is optional.

## Optional interactive TUI

Drives the same shapes through the catalog cases interactively (instant keys, no Enter): `k` keying seam, `a` add-on shape, `f` form shape, `m`/`r` extra views, `q` quit. If it doesn't render in your terminal, ignore it — REVIEW.md has everything.

## Run

```bash
cd pghrugby/nextjs
pnpm prototype:datocms-models
```

Press `1`–`5` to walk the catalog cases (dues / golf / SC7s / donations / events), and `k` / `a` / `f` to flip the three open seams. Keys act instantly — no Enter. `m` / `r` toggle the model definitions and route skeleton. Watch what breaks when a seam flips — that's the point.

## The proposed shape (defaults)

| Model                 | api_key            | Role                                                                                                                                                                                                                                                                                                                                                            |
| --------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🏷️ Product            | `product`          | One record per Stripe product needing editorial content. Thin: `title`, `sku`, `priceId` (seam), `description`, `featuredImage`. Prices live in Stripe; composition lives in flow groups.                                                                                                                                                                       |
| 🎯 Flow group         | `flowGroup`        | The taxonomy — replaces the removed `/collections` + `/categories` archives. One record per buyable flow page. **Inherits the `page` model's base structure** (title, slug, canonicalUrl, Cloudinary featuredImage JSON, flat `meta*` SEO fields, structured-text `content` with the shared image/gallery/video blocks) plus store fields: `flowItems`, `form`. |
| 📋 Form               | `form`             | Rehome of Sanity `formType` — registration payload shape, referenced by golf/SC7s flow groups.                                                                                                                                                                                                                                                                  |
| 🛒 Flow item (block)  | `flow_item_block`  | Composition row: product link + `kind` (primary \| addon) + optional label override.                                                                                                                                                                                                                                                                            |
| 🖊️ Form field (block) | `form_field_block` | One input: label, fieldName (payload key), fieldType enum, required, options, placeholder, `repeatable`.                                                                                                                                                                                                                                                        |

Page-shaped because the flow page route is modeled on `src/app/(core)/[slug]`: `flowGroupSlugs`/`flowQuery` alongside the page, `generateStaticParams`/`generateMetadata`/`notFound`, `executeQuery` with `excludeInvalid: false` + draft mode, and `StructuredText` rendering `content` through the same `BlocksFragment` switch already used by the `[slug]` route. The `content` block allowlist is exactly the existing shared blocks, so the renderer is unchanged.

## Decisions to react to

1. **The Stripe seam** (`k`). The ticket says "keyed to Stripe price IDs", but `src/lib/checkout/catalog.ts` is the server-authoritative sku → price map and prices rotate per season/year (dues, SC7s rates). Default: records key by **sku** and the catalog resolves the live price (rotation = code change, never a content republish). `priceId` becomes the price source only when the record is required to pin a specific price. Flip `k` to see the rotation consequence.
2. **Add-on composition** (`a`). Default: an inline `flow_item_block` per row (kind primary/addon, ordered, label overrides) — the "flexible flow-group mechanism" from the catalog-UI grilling. Alternative: two link fields (`products`, `addonProducts`) on the group — fewer records, no per-row label, a product can't appear twice with different labels.
3. **Form modeling** (`f`). Default: rehome of Sanity `formType` + a `repeatable` flag so the golf flow can render "captain + N golfers" (quantity = golfers). Plain rehome can't express the repeating section.
4. **Dropped from Sanity `product`**: `specs` (never rendered on the current page), `addons` (composition moves to the flow group), `form` (moves to the flow group — a flow's payload shape is a flow property, not a product's), `slug` (flow groups own URLs; product records aren't routed).
5. **Dropped from the `page` base structure**: `author`, `creationDate` (article-shaped; flow pages don't show bylines), `wpexcerpt`/`wpcontent`/`wpdata`/`seoAnalysis`/`structuredData` (WP-import legacy; the route generates its own JSON-LD). Flagged here so nothing vanishes silently.
6. **`featuredImage` stays Cloudinary JSON** for consistency with page/homepage and the `getCloudinaryImageProps` util — a DatoCMS-native `file` field with `responsiveImage` is the modern alternative; decide before the migration.
7. **Membership is out of scope** (stays on live Payment Links per the membership grilling). PWYW donation is deferred to its own ticket.

## Not modeled / later

- `events` family: the model already accommodates them (the `events` case in the TUI) — no schema change needed when they get flow pages.
- Draft/preview parity for product content (map fog — the route template already takes `includeDrafts` + `baseEditingUrl`).
- Admin menu placement (Content tab "Store" container: 🏷️ Products / 🎯 Flow groups / 📋 Forms) — match the project's existing menu conventions when the migration lands.

## What survives the prototype

- The model/field lists and validators in `models.ts` → the `datocms` migration.
- The GraphQL in the TUI (`renderGraphQL`) → `src/app/(core)/product/[handle]/flow.query.ts`, wired into gql.tada after `pnpm generate-schema`.
- The route skeleton → the new flow page, adapted from `(core)/[slug]`.
