# DatoCMS Product & Taxonomy Models — Review

Prototype ticket: _Prototype: DatoCMS product and taxonomy models_ — **RESOLVED**. All three decisions locked; this document records the final shape for the follow-up implementation ticket.

## Decisions — locked

| #   | Decision           | Verdict                                                                                                                                                                                                                                                   |
| --- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Stripe seam        | **A — key by `sku`.** DatoCMS stores the stable Stripe product id; `src/lib/checkout/catalog.ts` resolves the current price at session-build time. Price rotation = code change, never a content edit. `priceId` remains an optional per-record override. |
| 2   | Add-on composition | **A — inline `flow_item_block` rows.** `flowItems` is a modular-content field; each row links a product and carries `kind` (primary \| addon) + optional label.                                                                                           |
| 3   | Registration forms | **A — rehome + `repeatable` flag.** Golf renders "captain + N golfers" by marking the golfer field repeatable.                                                                                                                                            |

## What we were deciding

How DatoCMS should model:

1. **Products** — editorial content keyed to Stripe (one record per Stripe product, e.g. `dues-fall`, `golf-outing-registration`, `sc7s-mens-open`).
2. **Taxonomy** — the replacement for the removed `/collections` and `/categories` archives. Per the catalog-UI grilling, this collapses into one construct: a **flow group** — one record per buyable flow page (Dues, Golf Outing, Steel City 7s, Donate).

## Already locked (from prior tickets)

- Prices live in **Stripe**; `src/lib/checkout/catalog.ts` is the server-authoritative sku → price map. The client only ever sends selections.
- `family` (membership/dues/golf/tournament/donation) stays **Stripe metadata**.
- Add-ons (mulligan, drink band, additional side) are **separate product records** composed into a flow.
- Memberships stay on their live Payment Links — out of scope. Pay-what-you-want donations deferred to their own ticket.
- The flow-group model follows the **`page` model's base structure**, and the flow page route follows **`(core)/[slug]`**.

## The models

Page-base fields (inherited from the `page` model) are marked ✓.

### 🏷️ Product — `product` (model)

One record per Stripe product. Thin by design: it carries editorial content only; prices, family, and composition live elsewhere.

| Field              | Type   | Req | Notes                                                                                                                                            |
| ------------------ | ------ | --- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `title`            | string | ✓   | Display name; also the `<title>` fallback.                                                                                                       |
| `sku`              | string | ✓   | Stable Stripe product id (`dues-fall`, `golf-outing-mulligan`). Unique; lowercase/hyphen pattern. The anchor cart, orders, and sessions key off. |
| `priceId`          | string | –   | Optional override (seam = sku). Fill only to pin a price for this record; normally blank.                                                        |
| `shortDescription` | text   | –   | One-sentence option copy for the flow selector / option list.                                                                                    |
| `longDescription`  | text   | –   | Longer option detail rendered on the flow page (markdown).                                                                                       |
| `media`            | json   | –   | Cloudinary media JSON — **image or video** (`resource_type: image \| video`). Render via `@/utils/cloudinary`.                                   |

**Dropped from the Sanity `product` type** (with reason):

- `slug` — flow groups own URLs; product records aren't routed.
- `addons` — composition moved to the flow group (Decision 2).
- `form` — a flow's payload shape is a property of the flow group, not of each product.
- `specs` (lang/title/content) — never rendered on the current page.
- `featuredImage` — generalized to `media` (image or video).
- `description` — split into `shortDescription` + `longDescription`.

### 🎯 Flow group — `flowGroup` (model)

The taxonomy. One record per buyable flow page; its slug is the clean URL. Inherits the page model's base structure so the `[slug]` route pattern works unchanged.

| Field                                                                         | Type               | Req | Notes                                                                                                                                                                              |
| ----------------------------------------------------------------------------- | ------------------ | --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`                                                                       | string             | ✓   | "Season Dues", "Golf Outing", …                                                                                                                                                    |
| `slug`                                                                        | slug               | ✓   | Clean URL (`/dues`, `/golf-outing`). `beforeFiles` rewrite target for `/product/[handle]`. Auto-fills from title. Unique.                                                          |
| `canonicalUrl`                                                                | string             | –   | ✓ page base                                                                                                                                                                        |
| `description`                                                                 | text               | –   | Page intro copy under the H1.                                                                                                                                                      |
| `media`                                                                       | json               | –   | ✓ page base, generalized — Cloudinary image or video.                                                                                                                              |
| `content`                                                                     | structured_text    | –   | ✓ page base — long-form body reusing the **existing shared blocks** (image / gallery / video / external image), so the `[slug]` route's `BlocksFragment` renderer works unchanged. |
| `flowItems`                                                                   | rich_text (blocks) | ✓   | The curated, ordered composition (Decision 2).                                                                                                                                     |
| `form`                                                                        | link → form        | –   | Registration payload shape (golf, SC7s).                                                                                                                                           |
| `metaTitle` / `metaDescription` / `metaKeywords` / `metaRobots` / `metaImage` | string/text/json   | –   | ✓ page base — flat SEO fields the `[slug]` route already reads.                                                                                                                    |

**Dropped from the page base** (with reason):

- `author`, `creationDate` — article-shaped; flow pages have no byline/published-date meta.
- `wpexcerpt`, `wpcontent`, `wpdata`, `seoAnalysis`, `structuredData` — WordPress-import legacy; the route generates its own JSON-LD.

### 📋 Form — `form` (model)

Rehome of Sanity `formType` — the registration payload shape for flows that carry one.

| Field        | Type               | Req | Notes                             |
| ------------ | ------------------ | --- | --------------------------------- |
| `title`      | string             | ✓   | "Golf Outing — Captain & players" |
| `formFields` | rich_text (blocks) | –   | Ordered field list (Decision 3).  |

### 🛒 Flow item — `flow_item_block` (block)

Inline row inside `flowItems`. One product + how it plays in the flow.

| Field     | Type                      | Req | Notes                                                                                                       |
| --------- | ------------------------- | --- | ----------------------------------------------------------------------------------------------------------- |
| `product` | link → product            | ✓   |                                                                                                             |
| `kind`    | enum `primary` \| `addon` | ✓   | primary = main buyable option (dues season, division); addon = optional extra (mulligan, drink band, side). |
| `label`   | string                    | –   | Optional selector-label override.                                                                           |

### 🖊️ Form field — `form_field_block` (block)

| Field         | Type                                     | Req | Notes                                                           |
| ------------- | ---------------------------------------- | --- | --------------------------------------------------------------- |
| `label`       | string                                   | ✓   |                                                                 |
| `fieldName`   | string                                   | ✓   | Payload key in the orders table registration JSONB (camelCase). |
| `fieldType`   | enum text/email/textarea/select/checkbox | ✓   | Same set as Sanity.                                             |
| `required`    | boolean                                  | –   |                                                                 |
| `options`     | text                                     | –   | One per line; select only.                                      |
| `placeholder` | string                                   | –   |                                                                 |
| `repeatable`  | boolean                                  | –   | Repeat this field once per purchased unit (golfers).            |

## Example records (the real catalog)

**Season Dues** — flow group `dues` with 3 primaries, no form:

```
flowItems: primary dues-fall, primary dues-spring, primary dues-summer
```

**Golf Outing** — flow group `golf-outing` with 1 primary + 2 add-ons + a form:

```
flowItems: primary golf-outing-registration, addon golf-outing-mulligan, addon golf-outing-drink-band
form: captainName (text, req) · captainEmail (email, req) · golfers (text, req, repeatable × N)
```

**Steel City 7s** — flow group `steel-city-7s` with 5 primaries + 2 add-ons + a form:

```
flowItems: primary sc7s-mens-open, primary sc7s-mens-social, primary sc7s-mens-super-social,
           primary sc7s-womens-open, primary sc7s-womens-social,
           addon sc7s-mens-additional-side, addon sc7s-womens-additional-side
form: teamName (text, req) · contactName (text, req) · contactEmail (email, req)
```

**Donate** — flow group `donate` with 4 primaries, no form. PWYW not modeled yet (deferred).

**Event tickets** (ballpark, survivor pool, bar crawl, pig roast) — in the Stripe catalog, not flow-wired yet. The model already handles them: create product records + a flow group, done. No schema change needed later.

## GraphQL (as it will live in `src/app/(core)/product/[handle]/flow.query.ts`)

```graphql
fragment ProductFragment on ProductRecord {
  title
  sku
  priceId
  shortDescription
  longDescription
  media
}

fragment FlowItemFragment on FlowItemBlockRecord {
  kind
  label
  product {
    ...ProductFragment
  }
}

fragment FormFieldFragment on FormFieldBlockRecord {
  label
  fieldName
  fieldType
  required
  options
  repeatable
}

fragment FormFragment on FormRecord {
  title
  formFields {
    blocks {
      ... on FormFieldBlockRecord {
        ...FormFieldFragment
      }
    }
  }
}

query FlowQuery($slug: String!) {
  flowGroup(filter: { slug: { eq: $slug } }) {
    title
    slug
    canonicalUrl
    description
    media
    metaTitle
    metaDescription
    metaKeywords
    metaRobots
    metaImage
    content {
      value
      blocks {
        ...BlocksFragment
      }
    }
    flowItems {
      blocks {
        ... on FlowItemBlockRecord {
          ...FlowItemFragment
        }
      }
    }
    form {
      ...FormFragment
    }
  }
}
```

## Next step

The follow-up implementation ticket (child of the wayfinder map) will create these models via a `datocms` migration, seed the four flow groups, implement the flow page route + `beforeFiles` rewrites per the URL-scheme grilling, move the golf/SC7s forms off `/cart`, and wire the session builder to the flow-group composition.
