# SportsPress Data Access — WordPress REST API vs Fallback

**Decision: the public WordPress REST API is sufficient.** Historic competition data
(matches + standings) is fully readable **unauthenticated** via the plugin's
`sportspress/v2` namespace. No WXR export or DB access is needed.

Verified live on 2026-08-31 against `https://pghrugby.com` (curl, unauthenticated).

## What works — endpoints

### Root index

`https://pghrugby.com/wp-json/`

- Namespaces exposed include `wp/v2`, `wc/v3`, `sportspress/v2`, `yoast/v1`,
  `jetpack/v4`, `wordfence/*`.
- `authentication.application-passwords` is advertised (auth is enabled, but **not
  needed** for any read below).

### Post types (`wp/v2/types`)

`https://pghrugby.com/wp-json/wp/v2/types`

- `sp_event` → registered with `show_in_rest`, `rest_base: "events"`;
  taxonomies `sp_league`, `sp_season`, `sp_venue`.
- `sp_table` → registered with `show_in_rest`, `rest_base: "tables"`;
  taxonomies `sp_league`, `sp_season`.
- Also registered: `sp_team`, `sp_player`, `sp_staff`, `sp_calendar`, `sp_list`,
  `sp_directory`, `sp_tournament`.
- ⚠️ Despite `rest_base: "events"` / `"tables"`, the **core routes
  `wp/v2/events` and `wp/v2/tables` return HTTP 404**. The working surface is the
  plugin namespace `sportspress/v2` (below). Pagination `Link` headers in
  `sportspress/v2` responses point at `wp-json/wp/v2/events|tables` — a decoy;
  build next-page URLs from the `sportspress/v2` base instead.

### Matches

`https://pghrugby.com/wp-json/sportspress/v2/events?per_page=100&page=N` → `200 OK`

Key fields per event (top level; no `meta.sp_*` object — SportsPress exposes
plugin-native fields directly):

- `id`, `slug`, `link`, `title.rendered`, `date`, `date_gmt` — kickoff datetime.
  Sample: `"2025-11-08T12:00:41"` / `"2025-11-08T17:00:41"` (local America/New_York
  - UTC — note the observed -5h winter offset, i.e. `date` is site-local).
- `status` (`publish`), `minutes` (`"80"`).
- `teams: [id, id]` — `sp_team` post IDs (2 sides).
- `results: { teamId: { points, outcome, tries?, conversions?, ... }, "0": {points: "Points", outcome: "Outcome"} }`
  — per-team score + outcome. Key `"0"` is a header template row; strip it.
- `main_results: ["22", "20"]` — primary score column per team (same order as `teams`).
- `outcome: { teamId: "win"|"loss" }`, `winner: teamId` (or `null` if unplayed/draw).
- `leagues: [id]`, `seasons: [id]`, `venues: [id]` — taxonomy term IDs (may be empty).
- `performance`, `players`, `staff` — present but player-level stats are mostly
  header-row placeholders on historic matches; treat as unreliable.

Sample scored match (id 5642): Forge 22–20, winner `3913`, league `523`, season
`574`, venue `517`.

### Standings

`https://pghrugby.com/wp-json/sportspress/v2/tables?per_page=100` → `200 OK`

Key fields per table:

- `id`, `title.rendered`, `date`, `status`, `leagues: [id]`, `seasons: [id]`.
- `data: { teamId: { pos, name, gp, w, l, d, pf, pa, pd, bt, bl, ff, pts, lppg } }`
  — full standings rows keyed by `sp_team` ID, team **names inline**. Row
  `"0"` is a header template (`{pos:"Pos", name:"Team", ...}`); strip it.
- Sample (2023-08-22, league 567, season 574): 5 teams incl. "Forge Women D2" pos 2,
  columns GP/W/L/D/PF/PA/PD/BT/BL/FF/PTS/LPPG.

### Name resolution (companion lookups)

- Teams: `https://pghrugby.com/wp-json/sportspress/v2/teams?per_page=100` →
  `id`, `title.rendered`, `slug`, `abbreviation`, `url`, `leagues[]`, `seasons[]`,
  `venues[]`. Sample id 5649 = "Chicago North Shore".
- Taxonomies: `sportspress/v2/leagues/{id}`, `sportspress/v2/seasons/{id}`,
  `sportspress/v2/venues/{id}` → term name/slug. Samples: 523
  `midwest-playoffs-women-d1`, 574 `2025-fall`, 517 `phillip-murray-field`.
- Also available in the namespace: `players`, `staff`, `calendars`, `lists`,
  `directories`, `tournaments`, `positions`, `roles`.

## Counts (via `X-WP-Total` response header)

| Endpoint                           | X-WP-Total | Notes                                                |
| ---------------------------------- | ---------- | ---------------------------------------------------- |
| `sportspress/v2/events?per_page=1` | **127**    | 99/100 on page 1 carry scores → ~99% played/recorded |
| `sportspress/v2/tables?per_page=1` | **19**     | season/league standings snapshots                    |

## Auth & caching notes

- Reads require **no authentication**; no credentials to invent or wire up.
  (Application passwords are enabled on the site; `context=edit` would need them,
  but the `view` context already returns everything listed above.)
- Responses are Cloudflare-cached: `Cache-Control: max-age=172800` (~2 days),
  `cf-edge-cache: cache,platform=wordpress`, `Vary: User-Agent`. Repeat reads can
  be up to ~2 days stale; append a cache-buster query param if freshness matters.
- `Set-Cookie: PHPSESSID` is set on every response — irrelevant for JSON reads.

## Gaps / caveats

- `wp/v2/events|tables` item routes 404 → use `sportspress/v2` exclusively.
- Team/league/season/venue references are **IDs**; names need the companion
  lookup routes above (one extra pass, ~all rows in a couple of requests).
- `results` and `data` each contain a `"0"` header-template row — filter keys that
  are not real team IDs.
- Historic player performance stats appear unpopulated (header placeholders only);
  reliable historic data = match scores/outcomes/venues + standings snapshots.
- Events sometimes have empty `venues[]` (venue optional at entry time).
- Coverage is bounded by what's in WP: 127 events / 19 tables. If older seasons
  predate the WP install, no export/DB access would recover them either — verify
  the oldest `date_gmt` during the migration.

## Prior WP access patterns in this repo (all REST)

- The `migrations/import-wp/` WP → Sanity importer (since deleted) used
  `BASE_URL = "https://pghrugby.com/wp-json/wp/v2"` with a per-type paginated
  fetch helper.
- `migrations/dato-cms/migrate-{articles,categories,pages}.js` →
  `WORDPRESS_URL = "https://pghrugby.com"` + `/wp-json/wp/v2/{posts,categories,pages}?per_page=100&status=any`
  with app-password auth (env: `WORDPRESS_APP_USERNAME` / `WORDPRESS_APP_PASSWORD`
  in `nextjs/.env.local` — see `docs/agents/environment-secrets-inventory.md`).
- `docs/handoffs/wordpress-to-datocms-migration.md` — migration is REST-driven
  (`migrate-categories.js`, `migrate-articles.js`); no WXR/export in the repo.
- `scripts/scan-woocommerce.mjs:18` → `SITE = "https://pghrugby.com"`; REST-probe
  pattern (wc/v3; notes app passwords often 401 for WC — fallback to public
  scraping). Same probe pattern works for `sportspress/v2`.

## Recommended access method

1. Fetch `sportspress/v2/events` pages (127 items → `per_page=100`, 2 requests),
   `sportspress/v2/tables` (19 items, 1 request), and build ID→name maps once from
   `sportspress/v2/teams` (+ `leagues`, `seasons`, `venues`).
2. Use `date`/`date_gmt` for kickoff (UTC-safe), `teams` + `results.points` for
   scores, `winner`/`outcome` for results, `leagues`/`seasons`/`venues` for
   context, `data` for standings.
3. No auth headers; keep `Accept: application/json`.

## Fallback (only if REST becomes insufficient)

Not currently needed. If a future need outgrows the REST surface (e.g. raw
`sp_`-meta columns, `context=edit` shapes, or deleted records), the owner checklist:

- [ ] Re-verify `sportspress/v2/events|tables` still return 200 + `X-WP-Total`
      (run the curls above).
- [ ] If only meta depth is missing, try `?context=edit` with app-password auth
      from `nextjs/.env.local` before any export.
- [ ] WXR export: WP admin → Tools → Export → **All content** (includes `sp_event`,
      `sp_table`, `sp_team`, plus `sp_league`/`sp_season`/`sp_venue` terms), or the
      SportsPress-specific export if the plugin ships one. Import target: a throwaway
      WP instance to re-derive REST JSON.
- [ ] DB access: wp*postmeta rows keyed `sp*\*`(e.g.`sp_date`, `sp_team`,
  `sp_result`, `sp_winner`, `sp_league`, `sp_season`, `sp_venue`, `sp_players`),
  wp_posts for `sp_event`/`sp_table` rows, wp_term_taxonomy for taxonomies.
      Requires production DB creds + host — do not invent or print them.
- [ ] Any export/DB dump must be treated as PII-bearing and stored outside the repo.
