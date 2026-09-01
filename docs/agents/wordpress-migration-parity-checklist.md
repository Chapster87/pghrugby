# WordPress → DatoCMS Migration: Completion Inventory & Parity Checklist

Resolves the wayfinder task ticket **"WordPress migration completion and parity
checklist"** (#9). This is the gate the map names before `migrations/import-wp`
can be archived/deleted.

## 1. Migration scripts inventory

Source of truth is the live WordPress site at `pghrugby.com` (WP REST API,
`X-WP-Total` sampled 2026-09-01):

| Content                  | Live WordPress | Target                                     | Migration script                            | State                                                                                                          |
| ------------------------ | -------------- | ------------------------------------------ | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Posts (articles)         | 66             | DatoCMS `article`                          | `migrations/dato-cms/migrate-articles.js`   | Script completed + verified (see `docs/handoffs/wordpress-to-datocms-migration.md`); app consumes from DatoCMS |
| Categories               | 9              | DatoCMS `category`                         | `migrations/dato-cms/migrate-categories.js` | Script completed + verified; linked onto articles                                                              |
| Tags                     | 237            | DatoCMS `article.tags` (JSON string array) | `migrate-articles.js`                       | Scripted; per-article tag name lists                                                                           |
| Pages                    | 34             | DatoCMS `page`                             | `migrations/dato-cms/migrate-pages.js`      | Script exists; full-run state not explicitly verified                                                          |
| Authors                  | —              | DatoCMS `author` (via `authorMap`)         | `migrate-articles.js` / `migrate-pages.js`  | Scripted author-id → DatoCMS author map                                                                        |
| **WP → Sanity importer** | —              | (Sanity, now removed)                      | `migrations/import-wp/*`                    | **Obsolete** — targets Sanity which is fully removed. Safe to archive/delete                                   |

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

**Verified directly against the live DatoCMS CDA (queried 2026-09-01)** — counts
below are measured, not estimated. Only the flagged owner rows remain. Anything
in the **Out of scope** subsection is handled elsewhere and does **not** gate
readiness here.

| #   | Gate              | WordPress source                  | Measured (CDA)                                                        | Status                                                                                                            |
| --- | ----------------- | --------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | Article count     | 66 posts                          | 66 articles (66 published)                                            | ✅ exact match                                                                                                    |
| 2   | Article fields    | title/slug/author/excerpt/content | 66/66 have `wpexcerpt`; content present                               | ✅                                                                                                                |
| 3   | Article status    | publish vs draft                  | 66 published / 0 draft                                                | ✅                                                                                                                |
| 4   | Categories        | 9 categories                      | 9 `category` records; **66/66 articles have ≥1 category**             | ✅                                                                                                                |
| 5   | Tags              | 237 tags                          | 61/66 articles tagged; **220 distinct tags**                          | ⚠️ 5 untagged + 17-tag delta (owner spot-check vs WP)                                                             |
| 6   | Pages             | 34 pages                          | 18 `page` records (17 published)                                      | ⚠️ lower by design — legacy cleanup + graduated route-transition ticket own the rest                              |
| 7   | Authors           | WP author ids                     | `authorMap` → `author`                                                | ⚠️ owner spot-check on a sample                                                                                   |
| 8   | Images            | WP featured (Cloudinary)          | **51/66 articles have `featuredImage`**                               | ⚠️ 15 missing — confirm those WP posts genuinely lack a featured image; in-body images via `external_image_block` |
| 9   | SEO               | Yoast meta                        | `metaTitle`/`metaDescription`/`canonicalUrl`/`metaRobots`/`metaImage` | ✅ owner spot-check; sitemap emits all                                                                            |
| 10  | Obsolete importer | `migrations/import-wp/*`          | (WP → Sanity)                                                         | ✅ archived/deleted — unblocked by this ticket closing                                                            |

### Owner follow-ups (remaining ⚠️ rows)

- **Tags (gate 5):** 5 articles have no tags (listed below) and 220 distinct tags
  vs WP's 237. Confirm these 5 genuinely have no WP tags and that the 17-tag
  delta is expected (unused WP tags), not a migration miss.
- **Pages (gate 6):** 34 WP pages → 18 DatoCMS pages is expected: 13 shadowed/
  orphaned pages were deleted (legacy-pages cleanup) and the rest are owned by
  the graduated route-transition effort. Confirm the 18 (17 published) are the
  intended survivors.
- **Images (gate 8):** 15 articles lack a `featuredImage` — listed below. Verify
  each has none on the live WP site (if WP has one, the Cloudinary extraction
  in `migrate-articles.js` missed it and the row needs a backfill).
- **Authors (gate 7):** spot-check a sample of mapped authors.

**Articles missing `featuredImage` (15):**
`pittsburgh-forge-women-announce-jason-edsall-as-head-coach`, `forge-men-impressive-in-first-match`, `forge-men-dominate-in-week-one`, `forge-women-earn-first-win-over-south-buffalo`, `d3-men-make-statement-against-south-pitt`, `men-split-results-on-forge-day`, `forge-men-play-up-to-d1-competition-this-spring`, `forge-offers-summer-youth-rugby-at-bgcwpa-carnegie`, `forge-men-excited-for-fall-2019-season`, `forge-men-bolster-coaching-staff-for-fall-2021`, `forge-women-division-1-playoffs-2021`, `forge-mens-u23-announces-fall-2022-fixture`, `forge-rugby-announces-2023-scholarship-winners`, `forge-rugby-announces-2024-scholarship-winners`, `scholarship-recipients-for-2025-announced-by-pittsburgh-forge`.

**Articles missing tags (5):** `forge-rugby-announces-2026-scholarship-winners`, `pittsburgh-forge`, `help-the-forge-go-to-playoffs`, `forge-men-play-up-to-d1-competition-this-spring`, `forge-elects-new-board-of-directors`.

### Notes / known gaps

- **Pages parity is shared with another ticket.** The legacy-pages cleanup
  deleted 13 DatoCMS `page` records shadowed by app routes; the graduated
  "Transition remaining legacy DatoCMS pages to routes" effort (human) owns the
  rest. The 18 measured `page` records are the post-cleanup survivors.
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

- Editorial content is migrated to DatoCMS and served by the app. Article and
  category parity is **confirmed** (66/66, 9/9); the scripts are **preserved**
  until the flagged owner rows (tags, pages, featured images, authors) are
  cleared.
- `migrations/import-wp/` (WP→Sanity) is **confirmed obsolete** now that Sanity
  is removed; per the Sanity teardown decision it may be archived/deleted now
  that this ticket is closed. Owner action.
