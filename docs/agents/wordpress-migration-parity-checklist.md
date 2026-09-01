# WordPress → DatoCMS Migration: Completion Inventory & Parity Checklist

Resolves the wayfinder task ticket **"WordPress migration completion and parity
checklist"** (#9). This is the gate the map names before `migrations/import-wp`
can be archived/deleted.

## 1. Migration scripts inventory

Source of truth is the live WordPress site at `pghrugby.com` (WP REST API,
`X-WP-Total` sampled 2026-09-01):

| Content | Live WordPress | Target | Migration script | State |
| --- | --- | --- | --- | --- |
| Posts (articles) | 66 | DatoCMS `article` | `migrations/dato-cms/migrate-articles.js` | Script completed + verified (see `docs/handoffs/wordpress-to-datocms-migration.md`); app consumes from DatoCMS |
| Categories | 9 | DatoCMS `category` | `migrations/dato-cms/migrate-categories.js` | Script completed + verified; linked onto articles |
| Tags | 237 | DatoCMS `article.tags` (JSON string array) | `migrate-articles.js` | Scripted; per-article tag name lists |
| Pages | 34 | DatoCMS `page` | `migrations/dato-cms/migrate-pages.js` | Script exists; full-run state not explicitly verified |
| Authors | — | DatoCMS `author` (via `authorMap`) | `migrate-articles.js` / `migrate-pages.js` | Scripted author-id → DatoCMS author map |
| **WP → Sanity importer** | — | (Sanity, now removed) | `migrations/import-wp/*` | **Obsolete** — targets Sanity which is fully removed. Safe to archive/delete |

Storefront seeding scripts in `migrations/dato-cms/` (`create-storefront-schema.js`,
`seed-products.js`, `seed-detail-pages.js`, `seed-data-collectors.js`,
`fill-product-editorial.js`) are **not** part of this editorial migration — they
are owned by the storefront tickets (Task: Storefront flow pages … and the
provisioned-catalog work) and are out of scope here.

## 2. What has actually landed and is consumed

The app reads editorial content from DatoCMS, not WordPress:

- **Posts** — `/post/[slug]` (`src/app/(core)/post/[slug]/posts.query.ts`,
  `postQuery` on `article`, plus `postSlugs`) and the homepage latest-content
  slider (`allArticles`). Title, author, excerpt, body structured text,
  categories, tags, featured image, SEO fields all queried from `article`.
- **Pages** — root `[slug]` route (`pageSlugs` / `allPages`) and the sitemap
  (`allPages`).
- **Categories** — rendered on the post page; `category` is a linked record with
  `name`/`slug`/`description`/`parent`/`position`.

The DatoCMS schema (`src/lib/datocms/graphql-env.d.ts`) confirms the `article`,
`category`, and `page` models (plus legacy `pageOld`/`homepage`/`wpArticle`/
`wpAuthor`/`wpCategory`).

## 3. Parity checklist (gates readiness)

Owner must confirm the DatoCMS side (via CMA/CDA) against the WordPress source.
Each row is a readiness gate. Anything in the **Out of scope** subsection is
handled elsewhere and does **not** gate readiness here.

| # | Gate | WordPress source | DatoCMS / app target | Verify |
| --- | --- | --- | --- | --- |
| 1 | Article count | 66 published posts | `_allArticlesMeta.count` == 66 | Count matches; no stragglers |
| 2 | Article fields | title/slug/author/excerpt/content | `title`, `slug`, `author`, `wpexcerpt`, `content` (structured text) | Spot-check a spread of slugs |
| 3 | Article status | publish vs draft/pending | published vs draft items | Published status preserved per post |
| 4 | Categories | 9 categories | `category` records; linked on articles | Count + article↔category links intact |
| 5 | Tags | 237 tags | `article.tags` string arrays | Present where expected (JSON field, no tag model) |
| 6 | Pages | 34 pages | `page` records consumed by root `[slug]` + sitemap | Count matches (see note on shadowed pages) |
| 7 | Authors | WP author ids | `authorMap` → DatoCMS `author` | Mapped authors resolve |
| 8 | Images | WP featured + in-body (Cloudinary) | `featured_image` / `external_image_block` URLs | URLs resolve (Cloudinary media is owner/environmental — see #29) |
| 9 | SEO | Yoast meta | `metaTitle`/`metaDescription`/`canonicalUrl`/`metaRobots`/`metaImage` | Present on migrated posts/pages; sitemap emits all |
| 10 | Obsolete importer | `migrations/import-wp/*` | (WP → Sanity) | Archived/deleted — unblocked by this ticket closing |

### Notes / known gaps

- **Pages parity is shared with another ticket.** The legacy-pages cleanup
  deleted 13 DatoCMS `page` records shadowed by app routes; the graduated
  "Transition remaining legacy DatoCMS pages to routes" effort (human) owns the
  rest. Article/pages **count** verification here is against what remains after
  that cleanup.
- **DatoCMS draft-mode/preview for posts** is a recorded gap in the map's
  "Not yet specified" — it does not block this ticket but is listed so it isn't
  lost.
- **Cloudinary media** on product/PDP records is an owner/environmental gap
  tracked by Task: Storefront finishing; unrelated to editorial parity.

### Out of scope for this checklist

- **Legacy WP editorial URL redirects** (e.g. `/category/*`, `/tag/*`, old post
  permalinks). The URL-scheme ticket defined new URLs (`/post/[slug]`, root
  `[slug]`); `next.config.js` redirects cover only the 4 PDP URLs and
  `/social-links`. Full WP→new URL SEO redirect mapping is cutover work —
  explicitly out of scope in the map (Live-site cutover: SEO redirects).
- **Category/tag archive pages.** Not replicated in the app (categories render
  only as post labels). Consistent with the URL-scheme decision; WP archive URLs
  are cutover concerns above.

## 4. Disposition

- Editorial content is migrated to DatoCMS and served by the app; the migration
  scripts are **preserved** until count verification (gates 1, 4, 6) passes.
- `migrations/import-wp/` (WP→Sanity) is **confirmed obsolete** now that Sanity
  is removed; per the Sanity teardown decision it may be archived/deleted once
  this ticket closes. Owner action.
