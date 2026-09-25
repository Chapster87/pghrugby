# DatoCMS PDP restructure: three buckets + Cloudinary gallery

Status: **decided 2026-09-12** for
[Research: DatoCMS migration to three PDP buckets + gallery](https://github.com/Chapster87/pghrugby/issues/56)
on
[Wayfinder map: Multi-product PDP to minicart to checkout](https://github.com/Chapster87/pghrugby/issues/54).

This is a planning artifact: it fixes the shape of the DatoCMS migration for the
product detail page (PDP) and the data backfill for the four live PDPs. It does
not execute the migration.

## Scope

Replace `product_detail_page.pageComponents` — one ordered multi-link union of
`Product | DataCollector` — with three explicit ordered fields:

- `primaryProducts` → `product`
- `addonProducts` → `product`
- `dataCollectors` → `data_collector`

plus a page-owned `gallery`, and migrate the four existing PDP records (`dues`,
`golf-outing`, `steel-city-7s`, `donate`).

## Decisions

### 1. Three ordered multi-link fields

> **Extended by [Grilling: PDP product model — product_type (variation/grouped), per-line quantity, in-stock](https://github.com/Chapster87/pghrugby/issues/69)**
> (decided 2026-09-12) — adds a `product_type` on the PDP and `in_stock` /
> `quantity_bearing` on `product`. Detail in `docs/agents/pdp-product-model.md`;
> see § 1b below.

- **API keys** (snake_case, per repo convention): `primary_products`,
  `addon_products`, `data_collectors`.
- **Field type**: `links`, validator `items_item_type.item_types: [<model id>]`.
  The validator takes model **ids**, not api_keys — `product` is
  `LACQ-eAJQjSix9bWWrgdUQ`, `data_collector` is `f6LpE7kYTm6R7gJXxbCXlg`
  (migrations/dato-cms/fill-product-editorial.js, seed-data-collectors.js).
- **Ordering** is positional array order (drag to reorder). There is no ordering
  validator or attribute, and no `position` field is added.
- **`links` has no `required` validator.** Require at least one primary product
  with `validators.size: { min: 1 }`.
- **Primary vs add-on is structural** — it is the field the editor uses, not a
  `kind` enum. The "radio group when more than one primary" behaviour is a PDP
  **render** rule; DatoCMS cannot cap a multi-link at one.
- **Cascade strategies** must be set explicitly (the schema default for
  `on_reference_delete_strategy` is `delete_references`, which silently strips
  the reference). Use `fail` for the product fields. For `data_collectors`,
  `fail` is recommended (editors clear the PDP before deleting a collector);
  `delete_references` is the alternative if silent degradation is acceptable.
- GraphQL exposes `primaryProducts` / `addonProducts` / `dataCollectors`.

Payload shape (from `npx datocms cma:docs fields create --expand-types "*"`, see
`.agents/skills/datocms-cma/references/schema.md`):

```js
// client.fields.create(PDP_MODEL_ID, { ... })
{
  label: "Primary products",
  api_key: "primary_products",
  field_type: "links",
  hint: "The main product(s) this page sells. More than one renders a radio group (pick one). Drag to order.",
  validators: {
    items_item_type: {
      item_types: ["LACQ-eAJQjSix9bWWrgdUQ"],
      on_publish_with_unpublished_references_strategy: "fail",
      on_reference_unpublish_strategy: "fail",
      on_reference_delete_strategy: "fail",
    },
    size: { min: 1 },
  },
}
```

`addon_products` is the same with the product id and no `size`.
`data_collectors` is the same with `item_types: ["f6LpE7kYTm6R7gJXxbCXlg"]`.

### 1b. Product-model fields (from the product-model + pricing grillings)

Fields decided in `docs/agents/pdp-product-model.md`:

- `product_detail_page.product_type` — `string` enum (`simple` | `variation` |
  `grouped`), required, default `simple`, appearance `string_select`. Governs
  only how `primary_products` are selected (one / one-of-N / many-with-qty).
- `product.in_stock` — `boolean`; drives the PDP "Sold out" display and the
  server-side availability check at cart build + checkout-session creation.
- `product.quantity_bearing` — `boolean`; whether a line renders a quantity
  control. Quantity is per-line and independent of `product_type`.

Pricing fields decided in `docs/agents/pdp-pricing-and-sale-windows.md`:

- `product.price_id` — `string` (already present); becomes the **authoritative**
  regular Stripe Price (today it is selected by the PDP query but unused).
- `product.sale_price_id` — `string`, optional; the sale / early-bird Stripe
  Price.
- `product.sale_starts_at` / `product.sale_ends_at` — `datetime`, optional; the
  single sale window (club-local, `America/New_York`).

### 2. Gallery — Cloudinary JSON, not a native DatoCMS field

**Constraint (owner): no native DatoCMS media hosting (free tier).** Cloudinary
is used through the existing DatoCMS Cloudinary Picker field extension, the same
connector that backs `featured_image` on the `page` model.

Why not a native `gallery`: a DatoCMS **asset source** connector calls
`ctx.select()`, which creates an Upload **inside DatoCMS** — it uses DatoCMS
media storage, the thing being avoided
(.agents/skills/datocms-plugin/references/asset-sources.md). Native
`responsiveImage`/srcset/blur-up therefore does not apply here.

**Shape.** The picker returns one Cloudinary object per field, modelled on
`page.featured_image`. Its stored shape (migrations/dato-cms/migrate-articles.js):

```js
{
  public_id,
    id,
    version,
    format,
    width,
    height,
    bytes,
    created_at,
    duration,
    metadata,
    resource_type,
    type,
    url,
    secure_url,
    tags,
    created_by,
    uploaded_by
}
```

Because the picker is single-asset, `gallery` is a **Modular Content
(`rich_text`) field on `product_detail_page`, restricted to a new
`gallery_item_block`**. Each block is one ordered gallery item:

| Field           | Type   | Required | Notes                                                       |
| --------------- | ------ | -------- | ----------------------------------------------------------- |
| `desktop_media` | `json` | yes      | Cloudinary Picker; `featured_image`-shaped object           |
| `mobile_media`  | `json` | no       | Cloudinary Picker; art-directed crop; falls back to desktop |
| `alt`           | string | no       | The Cloudinary object carries no alt text                   |

- **Mobile + desktop**: the two stored Cloudinary objects are the art-directed
  variants; the renderer selects per breakpoint (`<picture>` / media query).
- **Video**: no separate field. The Cloudinary object's `resource_type`
  (`image` vs `video`) and `format` decide; the renderer branches to
  `next/image`/`CloudinaryImageRenderer` for images and a `<video>` (Cloudinary
  video URL) for video. `duration` is already in the object shape.
- **Storage-free**: no uploads are created in DatoCMS, so nothing counts against
  the free-tier media limits.
- **If the picker can emit an ordered array** into one field, a flat `gallery`
  `json` array of the same objects is an acceptable simpler variant. The block
  form is recommended because it works with the single-asset picker and gives
  editors add/remove/reorder plus a per-item alt.
- **Draft/preview**: unchanged. Draft mode is per-record; `draftMode()` and
  `_editingUrl` are already wired on the PDP route and need no gallery-specific
  plumbing. Stega (Content Link) covers only text fields, so `json`/`links`/
  modular fields were never click-to-edit. Visual editing for the gallery is a
  separate, still-open concern.

### 3. Data backfill for the four PDPs

`kind` in `src/lib/checkout/storefront-catalog.json` is the guide. Records were
seeded with all products where `pdp === slug`, in manifest order
(migrations/dato-cms/seed-detail-pages.js), and the two DataCollectors were
appended by seed-data-collectors.js.

| PDP slug        | `primary_products` (ordered)                                                                   | `addon_products` (ordered)                   | `data_collectors`                 |
| --------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------- | --------------------------------- |
| `dues`          | dues-fall, dues-spring, dues-summer                                                            | —                                            | —                                 |
| `golf-outing`   | golf-outing-registration                                                                       | golf-outing-mulligan, golf-outing-drink-band | "Golf Outing — Captain & players" |
| `steel-city-7s` | sc7s-mens-open, sc7s-mens-social, sc7s-mens-super-social, sc7s-womens-open, sc7s-womens-social | — (retired, see below)                       | "Steel City 7s — Team & contact"  |
| `donate`        | donation-club, donation-pass-the-hat                                                           | —                                            | —                                 |

> The `donate` row is what the applied backfill produced; the club presets later
> split into `donation-club-preset-10` / `-25` / `-50` records and the primaries
> reordered ladder-then-pass-the-hat
> ([Grilling: Donate PDP preset selection](https://github.com/Chapster87/pghrugby/issues/75)
> — detail in `docs/agents/donate-pdp-preset-selection.md`).

The six manifest products with `pdp: null` (ballpark ×2, survivor pool ×2, bar
crawl, pig roast) are not attached to any PDP and must not appear.

> SC7s has **no add-ons**: the additional sides are retired as buyable products
> and become a Stripe coupon/promotion-code discount
> ([Grilling: Steel City 7s additional-side pricing](https://github.com/Chapster87/pghrugby/issues/71) — decided;
> detail in `docs/agents/sc7s-additional-side-pricing.md`). The backfill must not
> place them; archive or delete their `product` records and Stripe products.

**Algorithm** (idempotent, order-preserving):

1. Build `id → sku` from the `product` model and an id set from `data_collector`.
2. For each `product_detail_page`, walk `page_components` in array order:
   - id in `id → sku` → push to `primary_products` or `addon_products` by
     `kind` (`addon` ⇒ addons, otherwise primary);
   - id in collectors set → push to `data_collectors`;
   - anything else → warn (do not crash).
3. Skip records whose target fields already equal the derivation.
4. `client.items.update(id, { primary_products, addon_products, data_collectors })`
   then `publish`.

`page_components` is a plain array of record ids and the new `links` fields also
accept plain id arrays, so no `buildBlockRecord` is needed. Support a `DRY_RUN`
flag for the first pass.

### 4. Migration mechanics — `datocms` CLI migration, forked sandbox first

> **Superseded 2026-09-25.** The fork-first requirement below no longer applies.
> The owner's preference is a single DatoCMS environment, so migrations run
> **in place on `main`** and creating, promoting or destroying an environment needs
> explicit approval — see `AGENTS.md` → "DatoCMS runs in a single environment".
> What still holds from this section is the shape of a migration, not where it
> runs: the split into reviewable files, and the guards inside each one, are what
> make a destructive step safe now that there is no sandbox.

**Decision: land this as `datocms` CLI migrations, in two timestamped files.**

1. `…_pdp-add-buckets-and-gallery` — create `primary_products`,
   `addon_products`, `data_collectors`, the `gallery` field and
   `gallery_item_block`; then run the backfill above.
2. `…_pdp-drop-page-components` — destroy `page_components` **last**, after the
   app query has switched and been verified.

Rationale: dropping `page_components` is a destructive schema change, which the
repo's `datocms-cli` skill requires go through a tracked migration against a
forked sandbox (`SKILL.md` § Step 2.5). The backfill must also be replayed
sandbox → production, which the skill classes as migration code, not a one-off
CMA script (`SKILL.md` content-operation row). Splitting the drop into its own
file makes the lossy step reviewable and skippable if verification fails.

**Relationship to the existing `migrations/dato-cms/*.js` scripts.** Those are
plain `@datocms/cma-client-node` scripts run by hand, with no `datocms.config.json`,
no CLI migrations directory, and no `schema_migration` tracking. They are
grandfathered; this change does not retrofit them or point the CLI at that
folder (its filenames — `seed-*.js` / `migrate-*.js` — do not match the CLI's
`/^\d+.*\.(js|ts)$/` discovery, and the folder is `"type": "module"` while the
CLI's JS template is CommonJS; use `--ts`).

**Bootstrap required first (mostly human):**

```bash
npm install --save-dev datocms          # repo root; CLI currently only under migrations/dato-cms
npx datocms login                       # HUMAN — browser OAuth, interactive
npx datocms projects:list <hint> --json # agent
npx datocms link --site-id=<ID>         # after HUMAN confirms the target project
# write datocms.config.json: profiles.default.siteId,
#   migrations.directory/modelApiKey/tsconfig, and apiTokenEnvName
```

Token note: the repo's `.env.local` carries `DATOCMS_CMA_TOKEN` while the
existing scripts read `DATOCMS_API_TOKEN`; the CLI profile must set
`apiTokenEnvName` (or the token must be exported under the CLI's default name).
The token needs `can_access_cma` **and** `can_edit_schema`.

**Sandbox vs production** (`datocms-cli` references `running-migrations.md`,
`environment-commands.md`, `deployment-workflow.md`):

- `migrations:run` defaults to **fork-and-run**: it forks the source into a new
  sandbox, runs pending migrations there, and leaves the source untouched on
  failure. Use `--source=<env> --destination=<fork>`.
- `--dry-run` previews; `--in-place` runs against the source (avoid on primary).
- Production follows the documented safe sequence, all **human-confirmed**:
  `maintenance:on` → `migrations:run --destination=release-…` →
  `environments:list` → `environments:promote release-…` → `maintenance:off`.
- The CLI migration path is recommended. The existing CMA-script style can still
  apply the same change, but only satisfies the "no new tooling" preference at
  the cost of tracking, targeting, and rollback safety.

### 5. Applied sequence (draft the plan, not yet executed)

1. Bootstrap CLI + link (human) and run `schema:inspect` to capture the live
   `product_detail_page` state (field ids, `page_components` validators, whether
   the two collectors are attached, `draft_mode_active`).
2. Author and run the two migrations on a fork (`--dry-run` first).
3. Verify on the fork: `schema:inspect`, a CDA read of the four PDPs, and render
   `/product/dues` etc. against the fork.
4. Switch the site query/render (`src/app/(core)/product/[slug]/
product-detail-page.query.ts`, `page.tsx`) from `pageComponents` to the new
   fields, and deploy it **with** the promote — the current query selects
   `pageComponents` as a non-null list, so the drop breaks rendering until the
   app is updated.
5. Promote (human-confirmed) and turn maintenance off.

## Open items / assumptions

- The live schema was **not** inspected (no CMA token available to the research
  session). Field ids, current `page_components` validators, whether
  `seed-data-collectors.js` actually ran against `main`, and
  `product_detail_page.draft_mode_active` are unverified — capture them in step 1.
- `gallery_item_block` and its field keys (`desktop_media`, `mobile_media`,
  `alt`) are proposed names; confirm before writing the migration.
- The array-vs-block gallery choice depends on whether the Cloudinary Picker can
  emit an ordered set into one field. The block form is assumed; it works either
  way.
- Whether an `alt` field is wanted on the block (Cloudinary objects carry no alt;
  today the repo falls back to `public_id`).

## Related

- `docs/agents/stripe-checkout-registration-metadata.md` — the per-line
  registration metadata decision (sibling research).
- `docs/handoffs/wordpress-to-datocms-migration.md` — the `featured_image`
  Cloudinary Picker shape this gallery mirrors.
- [Grilling: PDP product model — product_type (variation/grouped), per-line quantity, in-stock](https://github.com/Chapster87/pghrugby/issues/69)
  — decided; adds the fields in § 1b. Detail in `docs/agents/pdp-product-model.md`.
- [Grilling: Steel City 7s additional-side pricing](https://github.com/Chapster87/pghrugby/issues/71)
  — decided; the additional sides are retired as products and become a coupon /
  promotion-code discount. Detail in `docs/agents/sc7s-additional-side-pricing.md`.
