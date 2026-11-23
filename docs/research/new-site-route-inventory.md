# New-site route inventory

Research for GitHub issue [#177](https://github.com/Chapster87/pghrugby/issues/177).

This document enumerates every addressable route the Next.js app serves, tagged by
the source that produces it. It is a read-only inventory: no app code was changed.

## Method

- Static routes were read from the App Router tree (`src/app/**/page.tsx`), excluding
  `api/**`, the `(plugin)` group, and the dev-only `workbench`.
- DatoCMS records were read from the Content Delivery API using the published token
  in `.env.local` and the same queries the app uses (`PageSlugsQuery`,
  `PostSlugsQuery`, `ProductDetailPageSlugsQuery`). Only published records are
  counted.
- PDP clean URLs were read from `src/lib/checkout/storefront-catalog.json`
  (`flows[].slug`).
- Redirects and rewrites were read from `next.config.js`.
- ForgeCMS-fed routes were identified by their imports of `src/lib/forgecms/*`.

## Counts per source

| Source | Count | Notes |
| --- | ---: | --- |
| `static` | 15 page routes (+ `robots.txt`) | Non-dynamic `page.tsx` files |
| `datocms` | 46 records | 17 pages + 20 articles + 9 PDPs |
| `pdp` | 9 clean URLs | Same 9 pages as the DatoCMS PDP records |
| `forgecms` | 6 routes | Matches, schedules, standings, calendar |
| Dynamic route shapes | 3 | `/[slug]`, `/post/[slug]`, `/product/[slug]` |

The 9 `pdp` clean URLs and the 9 `datocms` `allProductDetailPages` records are the
same pages: the DatoCMS record is the content source, and the clean URL is the
addressable form (served by a rewrite). They are listed separately because they are
counted from different sources, but they do not add 9 extra pages.

## Static routes

Source: `src/app/**/page.tsx` (excluding `api/**`, `(plugin)`, `workbench`).

| URL | File | Notes |
| --- | --- | --- |
| `/` | `src/app/(core)/(home)/page.tsx` | Reads DatoCMS `HomeQuery` / `ArticlesQuery` |
| `/mens-schedule` | `src/app/(core)/(schedule)/mens-schedule/page.tsx` | ForgeCMS-fed (see below) |
| `/womens-schedule` | `src/app/(core)/(schedule)/womens-schedule/page.tsx` | ForgeCMS-fed (see below) |
| `/mens-standings` | `src/app/(core)/(standings)/mens-standings/page.tsx` | ForgeCMS-fed (see below) |
| `/womens-standings` | `src/app/(core)/(standings)/womens-standings/page.tsx` | ForgeCMS-fed (see below) |
| `/calendar` | `src/app/(core)/calendar/page.tsx` | Google Calendar API (tagged `forgecms` per issue) |
| `/cart` | `src/app/(core)/cart/page.tsx` | Transactional |
| `/contact` | `src/app/(core)/contact/page.tsx` | Shadows DatoCMS page `contact` |
| `/links` | `src/app/(core)/links/page.tsx` | Redirect target for `/social-links` |
| `/matches/all` | `src/app/(core)/matches/all/page.tsx` | ForgeCMS-fed (see below) |
| `/membership` | `src/app/(core)/membership/page.tsx` | |
| `/sitemap` | `src/app/(core)/sitemap/page.tsx` | HTML sitemap page |
| `/styleguide` | `src/app/(core)/styleguide/page.tsx` | Redirect target for `/style-guide` |
| `/checkout` | `src/app/(checkout)/checkout/page.tsx` | Transactional |
| `/checkout/success` | `src/app/(checkout)/checkout/success/page.tsx` | Transactional |

Metadata route:

| URL | File | Notes |
| --- | --- | --- |
| `/robots.txt` | `src/app/robots.ts` | Disallows `/api`, `/cart`, `/checkout`; disallows all when `SITE_NOINDEX=true` |

`src/app/opengraph-image.jpg` is a metadata asset, not a page route.

## DatoCMS records

Queries live in `src/lib/datocms/` and the route-local `*.query.ts` files. All reads
use `executeQuery` (`src/lib/datocms/executeQuery.ts`) against the published token.

### Pages — `allPages` / `PageSlugsQuery`

Source: `src/app/(core)/[slug]/pages.query.ts`. Served by `src/app/(core)/[slug]/page.tsx`
at `/{slug}`. 17 published records.

| Slug | Title | URL |
| --- | --- | --- |
| `womens-club` | Pittsburgh Forge Women's Rugby Club | `/womens-club` |
| `about` | About Us | `/about` |
| `contact` | Contact Us | `/contact` (shadowed by static route) |
| `mens-club` | Pittsburgh Forge Men's Rugby Club | `/mens-club` |
| `sponsors` | Sponsors – Redirected to Contact | `/sponsors` |
| `club-bylaws` | Club Bylaws | `/club-bylaws` |
| `covid-19-rtp-plan` | COVID-19 Return to Play Safety Plan | `/covid-19-rtp-plan` |
| `brendel-scholarship` | Neal R. Brendel Scholarship Fund | `/brendel-scholarship` |
| `player` | Players Catch-Up | `/player` |
| `mens-player` | Men's Player Catch-Up | `/mens-player` |
| `womens-player` | Women's Player Catch-Up | `/womens-player` |
| `womens-standing-archive` | Women's Standings – Archive | `/womens-standing-archive` |
| `minutes` | Minutes | `/minutes` |
| `merchandise` | Pittsburgh Forge Merchandise | `/merchandise` |
| `inclusivity` | Inclusivity Statement | `/inclusivity` |
| `womens-schedules-archive` | Women's Schedules – Archive | `/womens-schedules-archive` |
| `style-guide` | Style Guide | `/style-guide` (shadowed by redirect to `/styleguide`) |

### Articles — `allArticles` / `PostSlugsQuery`

Source: `src/app/(core)/post/[slug]/posts.query.ts`. Served by
`src/app/(core)/post/[slug]/page.tsx` at `/post/{slug}`. 20 published records.

| Slug | Title | URL |
| --- | --- | --- |
| `forge-rugby-announces-2026-scholarship-winners` | Forge Rugby Announces 2026 Scholarship Winners | `/post/forge-rugby-announces-2026-scholarship-winners` |
| `pittsburgh-forge` | The City's Newest Club: The Pittsburgh Forge | `/post/pittsburgh-forge` |
| `pittsburgh-forge-women-announce-jason-edsall-as-head-coach` | Pittsburgh Forge Women Announce Jason Edsall as Head Coach | `/post/pittsburgh-forge-women-announce-jason-edsall-as-head-coach` |
| `forge-men-announce-steve-walsh-as-head-d2-coach` | Forge Men Announce Steve Walsh as Head (D2) Coach | `/post/forge-men-announce-steve-walsh-as-head-d2-coach` |
| `forge-men-announce-allan-murray-as-assistant-d3-coach` | Forge Men Announce Allan Murray as Assistant/ D3 Coach | `/post/forge-men-announce-allan-murray-as-assistant-d3-coach` |
| `pittsburgh-celebrates-forge-day` | Pittsburgh Celebrates Forge Day! | `/post/pittsburgh-celebrates-forge-day` |
| `pittsburgh-forge-partners-with-essmc` | Pittsburgh Forge Partners with ESSMC | `/post/pittsburgh-forge-partners-with-essmc` |
| `dugan-associates-supports-pittsburghs-rugby-club` | Dugan & Associates Supports Pittsburgh's Rugby Club | `/post/dugan-associates-supports-pittsburghs-rugby-club` |
| `mhk-supports-the-pittsburgh-forge` | MHK Supports the Pittsburgh Forge | `/post/mhk-supports-the-pittsburgh-forge` |
| `steel-city-7s-recap` | Steel City 7's Recap! | `/post/steel-city-7s-recap` |
| `forge-men-at-entertain-crowd-at-highmark-stadium` | Forge Men Entertain Crowd at Highmark Stadium | `/post/forge-men-at-entertain-crowd-at-highmark-stadium` |
| `forge-men-impressive-in-first-match` | Forge Men Impressive in First Match | `/post/forge-men-impressive-in-first-match` |
| `forge-men-continue-preseason-work-at-wju` | Forge Men Continue Preseason Work at WJU | `/post/forge-men-continue-preseason-work-at-wju` |
| `forge-men-look-forward-to-first-league-season` | Forge Men Look Forward to First League Season | `/post/forge-men-look-forward-to-first-league-season` |
| `forge-men-dominate-in-week-one` | Forge Men Dominate in Week One | `/post/forge-men-dominate-in-week-one` |
| `pittsburgh-forge-women-debut-in-columbus-with-a-strong-win` | Forge Women Debut with Strong Win | `/post/pittsburgh-forge-women-debut-in-columbus-with-a-strong-win` |
| `forge-d3-stumble-against-presque-isle` | Forge D3 Stumble Against Presque Isle | `/post/forge-d3-stumble-against-presque-isle` |
| `forge-men-d2-win-big-in-south-buffalo` | Forge Men D2 Win Big in South Buffalo | `/post/forge-men-d2-win-big-in-south-buffalo` |
| `forge-women-earn-first-win-over-south-buffalo` | Forge Women Earn First Win Over South Buffalo | `/post/forge-women-earn-first-win-over-south-buffalo` |
| `forge-d2-drop-heartbreaker-in-cleveland` | Forge D2 Drop Heartbreaker in Cleveland | `/post/forge-d2-drop-heartbreaker-in-cleveland` |

### Product detail pages — `allProductDetailPages` / `ProductDetailPageSlugsQuery`

Source: `src/app/(core)/product/[slug]/product-detail-page.query.ts`. Served by
`src/app/(core)/product/[slug]/page.tsx`. 9 published records. The public address is
the clean URL (see PDP section); `/product/{slug}` 308-redirects to it.

| Slug | Title | Internal URL | Public URL |
| --- | --- | --- | --- |
| `steel-city-7s` | Steel City 7s | `/product/steel-city-7s` | `/steel-city-7s` |
| `golf-outing-sponsorship` | Golf Outing Sponsorship | `/product/golf-outing-sponsorship` | `/golf-outing-sponsorship` |
| `dues` | Season Dues | `/product/dues` | `/dues` |
| `ballpark` | Forge Day at the Ballpark | `/product/ballpark` | `/ballpark` |
| `survivor-pool` | NFL Survivor Pool | `/product/survivor-pool` | `/survivor-pool` |
| `bar-crawl` | Steel City 7s Bar Crawl | `/product/bar-crawl` | `/bar-crawl` |
| `pig-roast` | Annual Forge Pig Roast | `/product/pig-roast` | `/pig-roast` |
| `donate` | "Pass the Hat" Donation | `/product/donate` | `/donate` |
| `golf-outing` | Golf Outing | `/product/golf-outing` | `/golf-outing` |

## PDP clean URLs

Source: `src/lib/checkout/storefront-catalog.json` (`flows[]`). 9 flows. Each is
rewritten to `/product/{slug}` in `next.config.js`.

| Slug | Title | Clean URL |
| --- | --- | --- |
| `dues` | Season Dues | `/dues` |
| `golf-outing` | Golf Outing | `/golf-outing` |
| `golf-outing-sponsorship` | Golf Outing Sponsorship | `/golf-outing-sponsorship` |
| `steel-city-7s` | Steel City 7s | `/steel-city-7s` |
| `donate` | Donate | `/donate` |
| `pig-roast` | Annual Forge Pig Roast | `/pig-roast` |
| `bar-crawl` | Steel City 7s Bar Crawl | `/bar-crawl` |
| `ballpark` | Forge Day at the Ballpark | `/ballpark` |
| `survivor-pool` | NFL Survivor Pool | `/survivor-pool` |

## ForgeCMS-fed routes

Source: `src/lib/forgecms/competition.query.ts` (`MatchesQuery`) and the
`ScheduleTable` / `StandingsTable` / `MatchCountdown` components.

| URL | Data source | Notes |
| --- | --- | --- |
| `/matches/all` | ForgeCMS `MatchesQuery` | All matches |
| `/mens-schedule` | ForgeCMS | Men's D1 Fall 2025 schedule |
| `/womens-schedule` | ForgeCMS | Women's D1 Fall 2025 schedule |
| `/mens-standings` | ForgeCMS | Midwest Men's Rugby, Div 1 |
| `/womens-standings` | ForgeCMS | Women's standings |
| `/calendar` | Google Calendar API | Tagged `forgecms` per issue; actually reads Google Calendar, not ForgeCMS |

## Redirects and rewrites

Source: `next.config.js`.

### Rewrites (PDP clean URLs → internal route)

9 rewrites, one per `flows[].slug`:

```
/{slug}  →  /product/{slug}
```

These are `afterFiles` rewrites, so they resolve before the root `[slug]` dynamic
route and win over it.

### Redirects (308 permanent)

| Source | Destination | Reason |
| --- | --- | --- |
| `/product/{slug}` (×9) | `/{slug}` | Legacy internal PDP URL → clean URL |
| `/social-links` | `/links` | Legacy alias |
| `/style-guide` | `/styleguide` | Legacy alias |

Total: 11 redirects (9 PDP + 2 aliases).

## Dynamic routes and how they expand

| Route shape | Source | Expansion |
| --- | --- | --- |
| `/[slug]` | DatoCMS `allPages` | One page per published `page` record (17) |
| `/post/[slug]` | DatoCMS `allArticles` | One page per published `article` record (20) |
| `/product/[slug]` | DatoCMS `allProductDetailPages` | One page per published PDP record (9); exposed publicly via the 9 clean-URL rewrites |

All three use `generateStaticParams` with `includeDrafts: false`, so only published
records are prerendered. The `(core)` layout sets `revalidate = 3600`, and DatoCMS
reads carry the `datocms` cache tag purged by `src/app/api/revalidate/route.ts`.

## Collisions and shadowing

- DatoCMS page `contact` is shadowed by the static `/contact` route.
- DatoCMS page `style-guide` is shadowed by the `/style-guide` → `/styleguide` redirect.
- DatoCMS page `sponsors` is served at `/sponsors`; its title says "Redirected to
  Contact", but no redirect exists in `next.config.js`, so it renders as a page.
- The HTML sitemap (`src/app/(core)/sitemap/page.tsx`) links `/matches`, but no
  `/matches` page exists — only `/matches/all`. `/matches` falls through to `[slug]`
  and 404s.
- `next.config.js` documents reserved slugs that must not be created as DatoCMS
  pages: the 9 PDP clean URLs, `/product/*`, and the static routes listed above.

## Excluded from this inventory

- `src/app/api/**` — machine endpoints, not pages.
- `src/app/(plugin)/private-datocms-plugin/page.tsx` — DatoCMS plugin surface.
- `src/app/(core)/workbench/**` — dev-only; 404s in production.
