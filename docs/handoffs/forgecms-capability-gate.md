# ForgeCMS Capability Gate and cms-starter Handoff

Part of the wayfinder map: [Wayfinder map: Single-repo Next.js site on Stripe +
DatoCMS + ForgeCMS](https://github.com/Chapster87/pghrugby/issues/1) — ticket
[Task: ForgeCMS capability gate and handoff
list](https://github.com/Chapster87/pghrugby/issues/5).

Scope: what the live ForgeCMS Content Delivery API already serves for site chrome
(nav, footer, settings, socials, sponsors) and competition (standings, links,
teams, matches, schedules), and the handoff for the chrome/competition migrations
([Task: Site chrome migration to
ForgeCMS](https://github.com/Chapster87/pghrugby/issues/20) and [Research:
Competition data split](https://github.com/Chapster87/pghrugby/issues/8)).

Probed live against the local ForgeCMS instance (`FORGECMS_API_URL` =
`http://localhost:3000`, GraphQL at `{URL}/api/graphql`, header `x-api-key`).
Reusable probe script: `scripts/forgecms-introspect.mjs`.

## Gate result

**PASS — decisively.** Every chrome and competition model the gate asked about
**already exists and is largely populated** in the local ForgeCMS. The only real
gap is nav content: the `SiteNavigation` model exists but its `header`/`footer`
fields are **empty** (see Gaps). There is nothing for `cms-starter` to build —
the handoff is content population, field-name mapping, and cleanup.

## Decision

- Proceed with ForgeCMS for site chrome and competition — including the owner's
  target of `linktree` + `site_navigation`. Both models exist and are queryable.
- **No-linked-records constraint confirmed in the data.** Nav, linktree, and
  sponsor links are stored as **free-form strings / JSON arrays**, not typed
  references: e.g. linktree items are `{ type: "static", routePath: "/about",
  labelOverride: "About Us", children: [] }`, sponsors carry a literal
  `sponsor_url`. Refs exist only *within* ForgeCMS (match → team/league/division/
  season; standings → league/division/season). So nav items pointing at
  DatoCMS pages must be **literal paths** that match DatoCMS slugs — the app
  already owns those slugs. The owner's instinct holds: this is exactly the shape
  `site_navigation` uses.
- **DatoCMS fallback not needed.** All chrome + competition models are servable
  from ForgeCMS. Fall back to DatoCMS only if a specific model cannot be
  populated.

## Verified live contract

Singles are queried by camelCase (`linktree`, `siteSettings`, `socialSettings`)
**except `site_navigation`, which is snake_case**. Collections use
`<plural>Collection`. Reusable introspection: `node scripts/forgecms-introspect.mjs`.

### Site chrome

| Model | Query entry | Fields | Live data |
| ----- | ----------- | ------ | --------- |
| Nav/footer | `site_navigation { id header footer }` | `header` JSON, `footer` JSON | **`header`/`footer` = null** — needs content |
| Site settings | `siteSettings { … }` | `defaultPageTitle, titleSuffix, fallbackDescription, noIndex, siteUrl, favicon(Media)` | Populated; `favicon` null |
| Socials | `socialSettings { … }` | `socialSiteName, twitterUrl, facebookUrl, instagramUrl, linkedinUrl, youtubeUrl, tiktokUrl, socialCard(Media), ogType, ogLocale, twitterCardType` | Populated ("Pittsburgh Forge Rugby Club") |
| Sponsors | `sponsorsCollection { edges { node { name slug sponsor_url logo{url} } } }` | `id, name, article, slug, logo(Media), sponsor_url` | 6 sponsors (IC Light, Iron City, AHN, ESSMC, Ruggers Pub, Blackwell Law); `sponsor_url` null |
| Linktree | `linktree { id top_links club_info }` | `top_links` JSON, `club_info` JSON | Populated (About Us, Club Bylaws / Forge Merchandise) |

### Competition

| Model | Query entry | Fields | Live data |
| ----- | ----------- | ------ | --------- |
| Matches/schedules | `matchesCollection { edges { node { … } } }` | `event_name, match_date_time, match_type, slug, home_team(Teams), away_team(Teams), home_team_score, away_team_score, league(Leagues), division(Divisions), season(Seasons)` | Populated (e.g. "Pittsburgh Forge Men's D1 @ Chicago Griffins", 2025-09-27) |
| Teams | `teamsCollection { edges { node { … } } }` | `team_name, short_name, slug, team_logo(Media), league(Leagues), division[], seasons[]` | Populated |
| Standings | `standingsCollection` (already consumed by app) | `league, season, division, league_standings(JSON), slug` | Present (app uses it today) |
| Leagues / Divisions / Seasons | `leaguesCollection` / `divisionsCollection` / `seasonsCollection` | `name, slug, short_name` / `name, slug, short_name` / `year, display_name, season, slug` | Populated |
| Media | `media` (via refs) | `url, name, type, size, width, height, alt_text, folder, tags` | Cloudinary-hosted logos |

Note: `Matches`, `Teams`, and `Standings` already carry references to ForgeCMS
`Leagues`/`Divisions`/`Seasons`/`Media` records — the intra-ForgeCMS ref pattern
works; only DatoCMS records are out of reach (handled by free-form paths above).

## Handoff — no models to build, these to close

1. **Populate `site_navigation.header` and `footer`** (currently null) — the
   prerequisite for [Task: Site chrome migration to
   ForgeCMS](https://github.com/Chapster87/pghrugby/issues/20). Use the linktree
   JSON shape as the template: items `{ type, routePath, labelOverride,
   children[] }` with `routePath` matching DatoCMS page slugs.
2. **Fix the app `teamsQuery` mismatch.** The in-app query (matches/all) asks for
   `divison { … }` — a typo — and treats it as a single record; the live model is
   `division` (a list). Reconcile before wiring teams.
3. **Map nav/linktree `routePath` to DatoCMS slugs.** Confirm every nav target
   resolves to a live DatoCMS `[slug]`/`/post/[slug]` path.
4. **Populate `sponsor_url`** (null on current sponsors) and **`siteSettings.favicon`**
   (null) if those surfaces go live in the migration.
5. **Cleanup junk.** `boom`, `testing`, `testing_copy`, `TestBlock`/`Test2Block`
   models and test `pages` content (`new1`, `new-page`, `test-page`, `asdf`,
   `hgfj`) are dev leftovers — remove before cutover.

## Out of scope (this repo)

ForgeCMS internals, content editing, and model changes live in the separate
ForgeCMS/`cms-starter` repo — this repo produces handoff lists only. The cleanup
and nav-population items above are recorded here for that owner.
