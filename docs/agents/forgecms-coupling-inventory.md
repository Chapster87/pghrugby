# ForgeCMS coupling inventory — the surface to sever

Status: **researched** for
[Research: Inventory the in-repo ForgeCMS coupling to sever](https://github.com/Chapster87/pghrugby/issues/90)
on the wayfinder map. Feeds
[cutover plan + deletion set (#94)] and
[standings seam port (#97)].

> **Superseded.** This was the inventory and removal order for severing the
> embedded install, executed on [Task: Cut over the site to the external CMS and
> delete the in-repo install](https://github.com/Chapster87/pghrugby/issues/96).
> The topology it describes is gone: no `src/app/admin/**`, no `forgecore.json`,
> no host seam, no `/admin` mount. Kept as the record of what was coupled and why.

Destination (context, not verified from this repo): ForgeCMS runs as its own
deployed app at `cms.pghrugby.com` (repo `Chapster87/pghrugby-cms`), and this
site becomes a plain HTTP consumer of its server-to-server CDA at
`POST https://cms.pghrugby.com/api/graphql` with `x-api-key`. The embedded
install (`src/app/admin/**`, `forgecore.json`, the merged core deps, the
mounted-core env, `src/proxy.ts`) is removed; the `force-dynamic` bridge is
reverted; the standings seam moves to the instance's `src/extensions/**`.

Sources: the working tree at branch `89-site-runs-from-external-cms-site`
(HEAD `78a2dae`), `forgecore.json`, and the repo's own decision docs
(`docs/agents/forgecms-*.md`, `docs/handoffs/forgecms-*.md`). Every path/line
below was read in the working tree.

---

## 1. Summary

The coupling has three layers: (a) a **vendored admin subtree + marker + host
shell** (`src/app/admin/**`, `forgecore.json`, `src/proxy.ts`, `robots.ts`,
`public/feather-sprite.svg`) that exists only to serve the CMS's own UI; (b) the
**host seam** (`src/app/layout.tsx` → `src/cms/**`) that lets the site inject a
custom field editor into that subtree; and (c) the **site's CDA consumer**
(`src/lib/forgecms/*` + 13 call sites) that reads CMS content. Only (c) survives
the move — re-pointed at `cms.pghrugby.com`; (a) is deleted and (b) is ported.

The two genuinely risky items are: **the CDA client URL, which is derived from
the site's own `NEXT_PUBLIC_BASE_URL` + the `/admin` mount**
(`src/lib/forgecms/execute-query.ts:35-52`) — deleting the mount without
re-pointing it takes the whole public site's chrome and competition data down;
and **the `force-dynamic` bridge** (`src/app/(core)/layout.tsx:11`), whose
removal only works if the external CDA is reachable _during `next build`_, so it
must be sequenced after the re-point and verified rather than reverted blind.

---

## 2. Inventory

Legend: **Breaks if removed** = what fails in this repo if the item is removed
**today** (before the cutover); **Replacement** = what must exist on the external
CMS / site instead.

### A. Marker and mount

| #   | What it is                                                                                                                                                                                                                                                                                 | Path                                                                         | Breaks if removed                                                                                                                                                                                                                                                                 | Replacement                                                                                                 | Notes                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| A1  | forgecms install marker: `sourceRef`/`tag` `core/v3`, commit `f954ba…`, `mountPath: "/admin"`, `mountDir: "admin"`, `installedAt`, and the merged `dependencies` map (34 packages)                                                                                                         | `forgecore.json` (whole file)                                                | Nothing at runtime — no `src/` or config code imports it (grep: only docs reference it). It is metadata for `forgecms update`.                                                                                                                                                    | None on the site. The external `pghrugby-cms` repo owns its own install/instance.                           | Safe to delete once nothing else runs `forgecms install/update` here. Record the dep list from it (see G1) before deleting. |
| A2  | Vendored core admin subtree: pages, API route handlers, seam registry, media helpers, admin components, core styles. Contains its own `src/app/admin/lib/cms-path.ts` (`CMS_MOUNT_PATH = "/admin"`, line 8) and `export const dynamic = "force-dynamic"` in `src/app/admin/layout.tsx:18`. | `src/app/admin/**` (whole tree; also listed in `AGENTS.md` as "do not edit") | Build fails while anything still imports from it: `src/app/layout.tsx:5` (`@/cms/admin-registry`), `src/cms/standings/index.ts:1`, `src/cms/standings/standings-editor.tsx:3`, `src/cms/standings/standings-field.tsx:7-9`. Runtime: `/admin` and `/admin/api/*` disappear (404). | The external app serves all admin UI, auth, schema, media, and CDA endpoints. Nothing on the site needs it. | Delete **after** the seam wiring and the CDA re-point (see §4).                                                             |

### B. Host shell scaffolded by the install

| #   | What it is                                                                                                                                                                                                                                 | Path                                                                              | Breaks if removed                                                                                                                                                                                                                 | Replacement                                                                                                                                                                                                                  | Notes                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| B1  | Host page gate + Supabase session refresh. Redirects signed-out `/admin/**` UI (excluding `/admin/auth*` and `/admin/api*`) to `/admin/auth`; refreshes Supabase cookies on matched paths. Hardcodes `CMS_MOUNT_PATH = "/admin"` (line 6). | `src/proxy.ts` (1-41)                                                             | Once `/admin` is gone, nothing to gate — removing it breaks no public route. If removed _before_ the mount is gone, `/admin/**` stops redirecting and the admin routes render ungated.                                            | The external CMS owns its own auth gate at `cms.pghrugby.com`. The site no longer needs an `@supabase/ssr` middleware (orders/carts use raw PostgREST with the service role: `src/lib/checkout/supabase.ts`).                | Comment header says "Scaffolded by the ForgeCMS vendor CLI from docs/HOST-RUNTIME.md".                                |
| B2  | Root `robots.txt` route. Its only rule is `disallow: "/admin"`; `CMS_MOUNT_PATH = "/admin"` hardcoded (line 7).                                                                                                                            | `src/app/robots.ts` (1-15)                                                        | Deleting it removes the site's `robots.txt` entirely; keeping it after cutover emits a now-meaningless `Disallow: /admin`.                                                                                                        | Either delete (if the site wants no `robots.txt`) or strip the CMS-specific disallow and keep a site-appropriate policy. The admin's own `noindex` meta (`src/app/admin/layout.tsx:29-31`) travels to the external instance. | **Not in the ticket's coverage list** — found by grepping; it is CLI-scaffolded host code just like `src/proxy.ts`.   |
| B3  | Root layout + `<html>/<body>` shell added so the core could nest at `/admin`, and the `<AdminRegistry />` seam stitch.                                                                                                                     | `src/app/layout.tsx` (metadata 9-11; TSDoc 13-20; `<AdminRegistry />` at line 33) | The shell itself must stay (public site). Removing **only the `AdminRegistry` import (line 5) and mount (line 33)** breaks nothing once `src/cms/**` is ported. Leaving them while `src/app/admin/**` is deleted fails the build. | No registrar on the site. The instance registers its own extensions.                                                                                                                                                         | The root layout existed before the embed (Option A refactor), but the `<AdminRegistry />` mount is pure CMS coupling. |

### C. Host seam (`src/cms/**`)

| #   | What it is                                                                                                                                                                                                                                                                                                                                                                                                                   | Path                                                                                                                        | Breaks if removed                                                                                                                                                                                                                                                                                                                                                            | Replacement                                                                                                                                                                                                   | Notes                                                                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | Client registrar: `"use client"`, side-effect-imports `./standings`, renders null. Pulled into the admin client bundle by the root layout so `registerFieldType` runs before fields render.                                                                                                                                                                                                                                  | `src/cms/admin-registry.tsx` (1-16)                                                                                         | Build fails if `src/app/admin/**` is gone (the import chain resolves into it). If left with the core, admin field rendering loses the custom type registration.                                                                                                                                                                                                              | None on the site — the instance's own `src/extensions/**` registrar (moves with #97).                                                                                                                         |                                                                                                                                                                                      |
| C2  | `standings_table` field-type plugin: registration, `FieldRendererProps` adapter, editor grid UI, CSS, and rugby points logic. Imports core internals by host-relative path: `@/app/admin/seam` (`index.ts:1`), `@/app/admin/editor/[model]/_components/record-form/types` (`standings-editor.tsx:3`), `@/app/admin/components/button`, `.../fields/field-wrapper`, `.../fields/reference-field` (`standings-field.tsx:7-9`). | `src/cms/standings/index.ts`, `standings-editor.tsx`, `standings-field.tsx`, `standings-field.module.css`, `rugby-logic.ts` | Build fails without the core (imports resolve into `src/app/admin/**`). Public site is unaffected either way: standings delivery reads `league_standings` as opaque `GraphQLJSON` and does **not** need the plugin (`docs/agents/forgecms-site-layer-custom-models.md:210-215`). Admin authoring of the `standings_table` field falls back to a plain text input without it. | Port into the instance (`pghrugby-cms`) under `src/extensions/**` and register there (#97). Re-point imports to the instance's alias layout (producer `@/*` → `src/*`, per the same doc's translation table). | #97's primary input. `src/cms/standings/rugby-logic.ts` duplicates points math also present at `src/lib/helpers/standings-calc.ts` for the public table — keep both ends consistent. |
| C3  | Media provider seam registration. **Does not exist here.** No `src/instrumentation.ts`; nothing calls `registerClientMediaProvider`/`registerServerMediaProvider`.                                                                                                                                                                                                                                                           | (absent)                                                                                                                    | n/a                                                                                                                                                                                                                                                                                                                                                                          | The instance registers its own media provider(s) (e.g. Cloudinary) in its `src/extensions/**` + `instrumentation.ts`.                                                                                         | The seam contract itself (`src/app/admin/seam/media-provider.ts`) travels with the vendored core. `NEXT_PUBLIC_CMS_MEDIA_PROVIDER` is presently unused on the site.                  |

### D. Site CDA client and data layer

| #   | What it is                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Path                                                                  | Breaks if removed                                                                                                                 | Replacement                                                                                                                                                                                                                                                                                                  | Notes                                                                                                                                                                                                               |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | The site's CMS HTTP client. `CMS_MOUNT_PATH = "/admin"` (line 19); `isLocalOrigin` (22-24) + `resolveCmsBaseUrl` (35-43) derive the base from `NEXT_PUBLIC_BASE_URL` / Netlify `URL` / `DEPLOY_PRIME_URL` / localhost; `getCmsGraphqlUrl()` (49-52) returns `${base}/admin/api/graphql`; `CMS_CACHE_TTL_SECONDS = 300` (12); `executeQuery` sets `x-api-key: CMS_API_TOKEN` (78-81) and Next Data Cache tags/`revalidate` (84-92); `graceful` (103-117) resolves to `{}` on failure and logs a sanitized message. | `src/lib/forgecms/execute-query.ts` (whole file)                      | Removing/breaking it takes down every ForgeCMS-backed surface (see D4). Build also fails if `graceful` callers lose their client. | Rewrite: `getCmsGraphqlUrl()` → the external endpoint (`https://cms.pghrugby.com/api/graphql`, or a new single env var). Delete `CMS_MOUNT_PATH`, `isLocalOrigin`, `resolveCmsBaseUrl` (no mount, no local-origin trap). Keep `x-api-key` from `CMS_API_TOKEN`; keep or revisit the 300s TTL and `graceful`. | Line 15-18 comment records that `CMS_MOUNT_PATH` is hardcoded "until a producer-side change" — that change is now the external host.                                                                                |
| D2  | Chrome queries: `site_navigation` (header/footer), `siteSettings`, `socialSettings`, `sponsorsCollection`; plus the `mapNavNodes` JSON→NavItem adapter.                                                                                                                                                                                                                                                                                                                                                           | `src/lib/forgecms/chrome.query.ts` (whole file)                       | Removing breaks header, footer, checkout header, sponsor bar.                                                                     | Keep as-is (queries are CMS-side contracts, unchanged by hosting).                                                                                                                                                                                                                                           | No host-path coupling beyond importing D1.                                                                                                                                                                          |
| D3  | Competition queries + JS filter/sort helpers: `matchesCollection` (with league/division/season/team refs); `getAllMatches`, `sortMatchesByDate`, `filterMatchesByLeagueDivisionSeason`, `findNextUpcomingMatch`.                                                                                                                                                                                                                                                                                                  | `src/lib/forgecms/competition.query.ts` (whole file)                  | Removing breaks schedule tables, countdown, sidebar match widget, `/matches/all`.                                                 | Keep as-is.                                                                                                                                                                                                                                                                                                  | Comment (7-11) records the API's scalar-only `where` and no ordering — still true of the external CDA. Verify against the external schema (introspection).                                                          |
| D4  | Standings query builder (`standingsCollection(where: …)`).                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `src/components/competition/standingsTable/standings.query.ts` (1-39) | Removing breaks men's/women's standings pages.                                                                                    | Keep as-is.                                                                                                                                                                                                                                                                                                  | Uses nested `where` (`league`/`division`/`season`) that `competition.query.ts:7-9` says silently returns empty for collections — verify this query actually matches the external CDA. **Flagged as open question.** |

### D4a. Where the site reads the CDA today (all call sites)

Every consumer imports `executeQuery` (D1); none import the mount directly.

| #   | Consumer               | Path                                                   | What it queries                                           |
| --- | ---------------------- | ------------------------------------------------------ | --------------------------------------------------------- |
| 1   | Header (site)          | `src/components/header/index.tsx`                      | `siteNavigationQuery`, `siteSettingsQuery`                |
| 2   | Checkout header        | `src/components/header-checkout/index.tsx`             | `siteSettingsQuery` (`graceful`)                          |
| 3   | Footer                 | `src/components/footer/index.tsx`                      | `siteNavigationQuery`, `socialSettingsQuery` (`graceful`) |
| 4   | Sponsor bar            | `src/components/sponsor-bar/index.tsx`                 | `sponsorsQuery` (`graceful`)                              |
| 5   | Standings table        | `src/components/competition/standingsTable/index.tsx`  | `standingsQuery(...)`                                     |
| 6   | Schedule table         | `src/components/competition/scheduleTable/index.tsx`   | `getAllMatches`                                           |
| 7   | Countdown              | `src/components/competition/countdown/index.tsx`       | `ForgeCmsMatch` type from D3 (data passed in)             |
| 8   | Sidebar match widget   | `src/components/sidebar/_components/matches/match.tsx` | `findNextUpcomingMatch`, `getAllMatches`                  |
| 9   | Contact page           | `src/app/(core)/contact/page.tsx`                      | `socialsQuery`                                            |
| 10  | Links page             | `src/app/(core)/links/page.tsx`                        | `linksQuery`                                              |
| 11  | Matches/all page       | `src/app/(core)/matches/all/page.tsx`                  | `getAllMatches`, sort/filter helpers                      |
| 12  | Men's standings page   | `src/app/(core)/(standings)/mens-standings/page.tsx`   | via `<StandingsTable>`                                    |
| 13  | Women's standings page | `src/app/(core)/(standings)/womens-standings/page.tsx` | via `<StandingsTable>`                                    |

Note (coverage gap): because `(checkout)/layout.tsx` renders `<Footer />` (site
footer, CDA-backed) and `header-checkout`, the **checkout route group also calls
the CDA** and is not covered by the `(core)` `force-dynamic`.

### E. The `force-dynamic` bridge

| #   | What it is                                                                                                                                                                                                                                          | Path                                                             | Breaks if removed                                                                                                                                 | Replacement                                                                                                                                                          | Notes                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| E1  | `export const dynamic = "force-dynamic"` + explanatory comment (lines 7-11): the embedded CDA is unreachable during `next build`, so the public site renders at request time. Added in commit `767b114` ("Render the public site at request time"). | `src/app/(core)/layout.tsx:11`                                   | Not a "break" — a regression: with the embedded CDA still in place, removing it re-introduces the build-time unreachability that `767b114` fixed. | With an externally reachable CDA, revert it so the site can **prerender again**. Sequence after D1 re-point and verify; keep the `cmsCacheTag` / TTL tuning in mind. | Related history: `c2b01b3` (CDA URL local-origin fallback) and `1a14365` (don't log request headers — secret-scanner). |
| E2  | `(checkout)` group has **no** `dynamic` export and already calls the CDA at build via footer/checkout header, relying on `graceful`.                                                                                                                | `src/app/(checkout)/layout.tsx`                                  | n/a                                                                                                                                               | Decide whether checkout stays request-time or prerenders; its CDA calls must tolerate build-time availability (they use `graceful: true`).                           | **Not in the ticket's coverage list.**                                                                                 |
| E3  | `/workbench` and `/workbench/[demo]` set `force-dynamic` independently (dev-only pages that 404 in prod).                                                                                                                                           | `src/app/(core)/workbench/page.tsx:15`, `.../[demo]/page.tsx:13` | Unrelated to ForgeCMS; leave alone.                                                                                                               | —                                                                                                                                                                    | Explicitly **not** part of the CMS bridge; do not revert these.                                                        |

### F. Dependencies merged by the CLI

| #   | What it is                                                                                                                | Path                                              | Breaks if removed                                                                                                                               | Replacement                                               | Notes                |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------- |
| F1  | `dependencies` block containing the 34 packages listed in `forgecore.json.dependencies`, merged with the site's own deps. | `package.json` (24-87), lockfile `pnpm-lock.yaml` | Removing a package the site still imports fails the build. Removing the mount without pruning leaves unused packages (harmless but not "gone"). | Drop the core-only packages; regenerate `pnpm-lock.yaml`. | See the split below. |

**Core-only (in `forgecore.json.dependencies`, no import outside `src/app/admin/**`)**
— verified by importing-scope grep of `src/`excluding`src/app/admin/`:

`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `@graphiql/toolkit`,
`@modelcontextprotocol/sdk`, `@radix-ui/react-accordion`,
`@radix-ui/react-alert-dialog`, `@radix-ui/react-avatar`,
`@radix-ui/react-dropdown-menu`, `@radix-ui/react-label`,
`@radix-ui/react-popover`, `@radix-ui/react-toast`, all `@tiptap/*`,
`emoji-picker-react`, `graphiql`, `html-react-parser`, `jotai`, `marked`,
`react-hook-form`, `date-fns`, `@supabase/supabase-js`.

**Used by the site too (keep), even though listed as merged core deps:**

- `@radix-ui/react-checkbox`, `@radix-ui/react-dialog`, `@radix-ui/react-select`,
  `@radix-ui/react-switch`, `@radix-ui/react-tabs`, `@radix-ui/react-tooltip`,
  `@radix-ui/react-visually-hidden` — site components/workbench.
- `clsx`, `lucide-react` — site components **and** `src/cms/standings/standings-field.tsx`.
- `graphql-request` — `src/lib/forgecms/execute-query.ts` (D1). Stays.
- `@supabase/ssr` — used outside admin **only** by `src/proxy.ts` (B1), so it can
  be dropped when B1 is deleted. Verify no other site use.
- `graphql` — not shown as imported outside admin; likely only core/`graphiql`.
  Verify before dropping (it may be a peer of `graphql-request`).
- `@radix-ui/react-form`, `react-navigation-menu`, `react-radio-group` are
  **not** in the merged list (site deps) — leave them.

Caveat: `forgecore.json` tells us what the CLI _merged_, not which entries the
site already had. The reliable rule for #94 is the intersection test used here:
in `forgecore.json.dependencies` **and** no non-admin import.

### G. Environment

| #   | Variable                                                                                                                                                               | Where consumed today                                                                                                                                                                                                      | Fate                                                  | Notes                                                                                                                                                      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | `NEXT_PUBLIC_SUPABASE_URL`                                                                                                                                             | Core routes + `src/lib/checkout/supabase.ts` (orders/carts)                                                                                                                                                               | **Stays**                                             | Shared with the external instance's DB.                                                                                                                    |
| G2  | `SUPABASE_SERVICE_ROLE_KEY`                                                                                                                                            | Core routes + `src/lib/checkout/supabase.ts`                                                                                                                                                                              | **Stays**                                             | RLS-bypassing orders/carts writes; never expose to browser.                                                                                                |
| G3  | `NEXT_PUBLIC_SUPABASE_ANON_KEY`                                                                                                                                        | Embedded core only: `src/app/admin/client/graphqlClient.ts`, `src/app/admin/utils/supabase.ts`, and B1's `src/proxy.ts`                                                                                                   | **Drop from the site** once B1 + the mount are gone   | `check-env-variables.js:30-33` describes it as "embedded ForgeCMS client/auth". No non-admin use found.                                                    |
| G4  | `CMS_API_TOKEN`                                                                                                                                                        | `src/lib/forgecms/execute-query.ts:80` (site CDA `x-api-key`); core CDA route validates it; `scripts/forgecms-introspect.mjs`; core GraphQL playground                                                                    | **Stays, re-pointed**                                 | Now only _sent_ to the external CDA, which does the validation. Value must match the instance's key.                                                       |
| G5  | `CMS_MOUNT_PATH`                                                                                                                                                       | Not an env var — a hardcoded host constant in `src/proxy.ts:6`, `src/lib/forgecms/execute-query.ts:19`, `src/app/robots.ts:7`, `scripts/forgecms-introspect.mjs:9`, and (core-internal) `src/app/admin/lib/cms-path.ts:8` | **Delete all host occurrences**                       | Ticket lists it among env keys; it is code constants, not env.                                                                                             |
| G6  | `NEXT_PUBLIC_BASE_URL`                                                                                                                                                 | `src/lib/util/env.ts` (metadata/canonical), `src/lib/forgecms/execute-query.ts` (CDA base)                                                                                                                                | **Stays** for site URLs; **stops** being the CDA base | The CDA base becomes the external host.                                                                                                                    |
| G7  | `NEXT_PUBLIC_CMS_PRODUCT_NAME`                                                                                                                                         | Core admin wordmark (default "Content Management"; set to `Pittsburgh Forge`)                                                                                                                                             | **Move to the instance**; drop here                   |                                                                                                                                                            |
| G8  | `NEXT_PUBLIC_CMS_MEDIA_PROVIDER`                                                                                                                                       | Core media seam; currently unused (no provider registered)                                                                                                                                                                | **Drop here** unless the instance needs it set        |                                                                                                                                                            |
| G9  | `NEXT_PUBLIC_CMS_CDA_SITE_SETTINGS`, `NEXT_PUBLIC_CMS_CDA_SOCIAL_SETTINGS`, `NEXT_PUBLIC_CMS_GLOBALS_SITE_SETTINGS_KEY`, `NEXT_PUBLIC_CMS_GLOBALS_SOCIAL_SETTINGS_KEY` | Core CDA surface toggles/defaults                                                                                                                                                                                         | **Drop here / move to instance**                      | Optional core knobs per `docs/agents/forgecms-env-build-surface.md:45-55`.                                                                                 |
| G10 | `FORGECMS_API_URL`, `FORGECMS_API_TOKEN`                                                                                                                               | Retired already                                                                                                                                                                                                           | **Already absent from code**                          | Only referenced in `docs/agents/environment-secrets-inventory.md` as dead. Do not reintroduce; the external URL is a _new_ consumer config, not this pair. |

Whether any `NEXT_PUBLIC_CMS_*` value is actually set on the site's current
hosting is **not verifiable from the repo** (`.env.local` is gitignored; grep
does not read it). See open questions.

### H. Public asset

| #   | What it is                                                                                                                                                    | Path                        | Breaks if removed                                                                            | Replacement                                               | Notes                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ----------------------------- |
| H1  | Feather icon sprite copied into the host `public/` by install. Referenced **only** from `src/app/admin/**` components (`<use href="/feather-sprite.svg#…">`). | `public/feather-sprite.svg` | Nothing outside the admin mount references it; deleting it only breaks admin icon rendering. | The external instance ships its own copy via its install. | No non-admin reference found. |

### I. Scripts

| #   | What it is                                                                                                          | Path                                                                                       | Breaks if removed                                                 | Replacement                                                                                              | Notes                                              |
| --- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| I1  | CDA schema introspection probe. Builds `${NEXT_PUBLIC_BASE_URL}/admin/api/graphql` (line 17) and sends `x-api-key`. | `scripts/forgecms-introspect.mjs`                                                          | Only the manual probe breaks; not on the build path.              | Re-point at the external CDA (or delete). Still useful for verifying the external schema before cutover. | Not exposed as an npm script.                      |
| I2  | Supabase schema/row probe. Reads `models`/`fields` and counts competition rows.                                     | `scripts/inspect-forgecms.mjs`; npm script `supabase:inspect-forgecms` (`package.json:22`) | Not coupled to the mount; coupled to the shared Supabase project. | Keep (the CMS data still lives in the shared Supabase DB). Retitle.                                      | Used to size migrations per its header.            |
| I3  | DatoCMS schema generator.                                                                                           | `scripts/generate-datocms-schema.mjs`; npm script `generate-schema`                        | Unrelated to ForgeCMS.                                            | Keep.                                                                                                    | Mentioned only to note it is **not** CMS-coupling. |

### J. Docs and rules

| #   | What it is                                                                                                                                           | Path                                                                                                                                                                            | Breaks if removed                                                                                                        | Replacement                                                                                                                                                       | Notes                                                                               |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| J1  | Decision docs that define the embedded model: CDA at `${BASE}/admin/api/graphql`, `CMS_MOUNT_PATH`, host gating, seam Option A, `core/v2`/`core/v3`. | `docs/agents/forgecms-auth-cda-gating.md`, `docs/agents/forgecms-env-build-surface.md`, `docs/agents/forgecms-site-layer-custom-models.md`                                      | Nothing at build; stale guidance will drive future work wrong (e.g. "keep CDA on the mount path").                       | Mark **superseded** by this inventory + the cutover; rewrite or archive. The HOST-RUNTIME smoke contract (§1 of the auth doc, lines 61-71) moves to the instance. | #97 sources the seam translation table from `forgecms-site-layer-custom-models.md`. |
| J2  | Producer→host handoffs.                                                                                                                              | `docs/handoffs/forgecms-root-layout-option-a.md`, `docs/handoffs/forgecms-capability-gate.md`                                                                                   | Same as J1: historically useful, now describes a retired topology.                                                       | Archive/supersede. Keep the capability-gate content as the CDA contract reference if still accurate.                                                              |                                                                                     |
| J3  | Repo-level agent rules asserting the mount is sacred and the seam lives in `src/cms/**`.                                                             | `AGENTS.md` ("ForgeCMS mounted core — do not edit", lines 14-27); `.agents/rules/folder-organization.md` "Host topology" (14-19); `CONTEXT-MAP.md` (10-12); `README.md` (13-15) | Nothing at build; agents would keep preserving a deleted tree.                                                           | Update to: "ForgeCMS is an external service; the site consumes its CDA. No admin subtree in this repo." Keep the "never mount Strapi/Sanity/Medusa" rules.        |                                                                                     |
| J4  | Shared-DB access doc describing ForgeCMS tables in the same Supabase project.                                                                        | `docs/agents/supabase-postgrest.md`                                                                                                                                             | Still basically accurate (data stays in Supabase); only the framing ("website + ForgeCMS share one project") may change. | Keep; adjust if the instance moves off the shared project.                                                                                                        |                                                                                     |
| J5  | Env inventory with ForgeCMS rows.                                                                                                                    | `docs/agents/environment-secrets-inventory.md` (43-50, 125-133)                                                                                                                 | Stale rows (`/admin/api/graphql`, embedded notes).                                                                       | Update per G1-G10.                                                                                                                                                |                                                                                     |

### K. Build/test gates and smokes that assume the mount

| #   | What it is                                                                                                                                                                              | Path                                                                                                             | Breaks if removed                                                                                                                                                                        | Replacement                                                                                                                                    | Notes                                                                                                       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| K1  | Build-time env check run from `next.config.js:1-3`. Requires `NEXT_PUBLIC_SUPABASE_ANON_KEY` ("embedded ForgeCMS client/auth") and `CMS_API_TOKEN` ("storefront + /admin/api/graphql"). | `check-env-variables.js:30-37`; invoked in `next.config.js:3`                                                    | Removing `CMS_API_TOKEN` from the list would lose the (still-needed) CDA key warning; keeping `NEXT_PUBLIC_SUPABASE_ANON_KEY` warns about a key the site no longer needs.                | Drop `NEXT_PUBLIC_SUPABASE_ANON_KEY`; retitle `CMS_API_TOKEN` to the external CDA. Missing keys are warnings, not fatal.                       |                                                                                                             |
| K2  | HOST-RUNTIME smoke set: `GET /` 200; signed-out `/admin/**` UI 307→`/admin/auth`; `/admin/auth` 200; `/admin/api/models` (no session) 401.                                              | `docs/agents/forgecms-auth-cda-gating.md:61-71`; `docs/handoffs/forgecms-root-layout-option-a.md:94-95, 115-116` | These are documentation, not an automated gate. After cutover the `/admin` rows are **not applicable to this repo** (routes gone).                                                       | Move the four checks to the instance deployment. Add site-side checks: key public pages 200 against the external CDA; a build that prerenders. | There is **no CI**: `.github/` is empty. No test runner config, no `*.test.*` files (find across the repo). |
| K3  | Type safety is disabled at build.                                                                                                                                                       | `next.config.js:31-33` (`typescript.ignoreBuildErrors: true`)                                                    | Partial deletion of the seam/mount will not fail `next build` on type errors, so **do not rely on the build to catch dangling imports** — verify with `tsc`/lint or by grepping imports. | Consider re-enabling after cleanup (or at least run `tsc --noEmit` as a manual gate).                                                          | Important sequencing hazard for #94.                                                                        |

### L. Other coupling not in the ticket's list

| #   | Finding                                                                                                                                                          | Path                                                                                                           | Why it matters                                                                                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| L1  | `robots.ts` (B2) is CLI-scaffolded host code with a hardcoded mount.                                                                                             | `src/app/robots.ts`                                                                                            | Listed in §B; grep-detected.                                                                                                                                                   |
| L2  | The checkout route group calls the CDA (footer + checkout header) but is outside the `force-dynamic` bridge.                                                     | `src/app/(checkout)/layout.tsx`; `src/components/footer/index.tsx`; `src/components/header-checkout/index.tsx` | Build-time CDA availability already matters for checkout; must be considered in E1's revert.                                                                                   |
| L3  | `src/lib/util/env.ts` was changed alongside the CDA URL fix (commit `c2b01b3`) to prefer Netlify's `URL`/`DEPLOY_PRIME_URL` over a local `NEXT_PUBLIC_BASE_URL`. | `src/lib/util/env.ts` (1-16)                                                                                   | This is because `NEXT_PUBLIC_BASE_URL` also fed the CDA URL. After D1 re-point the coupling is gone, but the fallback logic is now site-URL logic — decide whether to keep it. |
| L4  | Next Data Cache tag `cms-content` + 300s TTL, now purged on demand by the publish-signal receiver at `src/app/api/revalidate/route.ts`.                          | `src/lib/forgecms/execute-query.ts:3,12`; `src/app/api/revalidate/route.ts`                                    | The TTL stays the floor; the webhook is the fast path. `forgecms@2.2.0` emits the signal (ADR-0009 / `docs/WEBHOOKS.md`). Affects E1.                                          |
| L5  | `src/cms/standings/standings-field.tsx` uses `lucide-react` and `clsx` — shared with the site.                                                                   | —                                                                                                              | Part of F1's keep-list; #97 must carry these into the instance.                                                                                                                |
| L6  | Core's `/admin` uses Supabase PostgREST directly (`/graphql/v1`, `models`/`fields` tables).                                                                      | `src/app/admin/client/graphqlClient.ts`, `src/app/admin/api/**`                                                | The external instance must be pointed at the same (or a migrated) Supabase project, including the auth redirect allow-list. Not a site-side change, but a cutover dependency.  |

---

## 3. Deletion set (exact, for #94)

**Delete outright**

- `src/app/admin/**` (entire subtree)
- `forgecore.json`
- `src/proxy.ts` (B1)
- `src/cms/admin-registry.tsx`
- `src/cms/standings/**` — **after** porting to the instance (#97)
- `public/feather-sprite.svg`
- `scripts/forgecms-introspect.mjs` — or re-point instead of delete (I1)

**Edit / revert**

- `src/app/layout.tsx` — remove `AdminRegistry` import (5) and element (33), and the TSDoc note (18-19)
- `src/app/(core)/layout.tsx` — remove `export const dynamic = "force-dynamic"` and its comment (7-11). Do **not** touch `/workbench` dynamic exports (E3)
- `src/lib/forgecms/execute-query.ts` — re-point the URL; delete `CMS_MOUNT_PATH` (19), `isLocalOrigin` (22-24), `resolveCmsBaseUrl` (35-43); revisit TTL (12) and `graceful` (103-117)
- `src/app/robots.ts` — delete the file or strip the `/admin` disallow (B2)
- `check-env-variables.js` — drop `NEXT_PUBLIC_SUPABASE_ANON_KEY` (30-33); retitle `CMS_API_TOKEN` (34-37)
- `package.json` — remove the core-only deps in F1; regenerate `pnpm-lock.yaml`
- `src/lib/util/env.ts` — optional: revert the local-origin fallback (L3)
- Docs: supersede `docs/agents/forgecms-*.md` (3), `docs/handoffs/forgecms-*.md` (2); update `AGENTS.md`, `.agents/rules/folder-organization.md`, `CONTEXT-MAP.md`, `README.md`, `docs/agents/environment-secrets-inventory.md`

**Env / hosting (not files)**

- Drop: `NEXT_PUBLIC_SUPABASE_ANON_KEY`, all `NEXT_PUBLIC_CMS_*` (or move to the instance)
- Keep (re-pointed): `CMS_API_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_BASE_URL`
- Do **not** reintroduce `FORGECMS_API_URL` / `FORGECMS_API_TOKEN`

**Not in the deletion set**

- `netlify.toml` — no ForgeCMS coupling. It only omits `GOOGLE_CALENDAR_API_KEY`
  and `RESEND_API_KEY` from Netlify's secrets scan (unrelated false positives).
- `scripts/inspect-forgecms.mjs`, `scripts/generate-datocms-schema.mjs`,
  `src/lib/checkout/**`, `src/lib/datocms/**` — keep.
- `(checkout)` CDA calls — keep; only decide their render mode.

---

## 4. Removal order

The invariant: **keep the site buildable and data-fed at every step.** The
external CDA must be serving before the mount can go, and the seam must stop
importing the mount before it can be deleted.

1. **Re-point the CDA client (D1) at the external endpoint.** Rewrite
   `getCmsGraphqlUrl()`; stop deriving from `NEXT_PUBLIC_BASE_URL`/mount. The
   embedded core is still present and can stay as a fallback. _Gate:_ public
   pages render from `cms.pghrugby.com`; standings/matches/chrome all load.
   _Why first:_ deleting anything mount-related before this point would leave
   the site with no CDA.
2. **Port the standings seam (#97)** into `pghrugby-cms` `src/extensions/**`,
   re-pointing the core-relative imports; verify editing on the instance. _Gate:_
   a standings record round-trips through the instance admin. _Why here:_ the
   site's public standings already work without the plugin (C2), so this is
   safe to do while the repo still has the seam for reference.
3. **Remove the seam wiring here:** root-layout `AdminRegistry` import/mount
   (B3), then `src/cms/**` (C1, C2). _Gate:_ `tsc --noEmit` / lint clean
   (K3 — `next build` will not catch dangling imports). _Why before step 5:_
   `src/cms/**` and the root layout are the only non-admin importers of
   `src/app/admin/**`.
4. **Revert the `force-dynamic` bridge (E1)** and confirm the build prerenders
   against the now-external CMS. _Gate:_ a production build that fetches the
   CDA and prerenders; decide TTL/`graceful` (L4). _Why after step 1:_ removing
   it before the CDA is externally reachable is exactly the failure `767b114`
   fixed. Re-check `(checkout)` (E2).
5. **Delete the mount and its host shell:** `src/app/admin/**` (A2),
   `forgecore.json` (A1), `src/proxy.ts` (B1), `robots.ts` handling (B2),
   `public/feather-sprite.svg` (H1). _Gate:_ no route serves `/admin`; the four
   HOST-RUNTIME smokes are retired here (K2); site smoke stays green. _Why last
   among code:_ nothing outside the mount may still import it (step 3).
6. **Prune dependencies and env:** remove the core-only packages (F1), drop
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `NEXT_PUBLIC_CMS_*` from hosting and
   `check-env-variables.js` (K1), regenerate `pnpm-lock.yaml`. _Gate:_ clean
   install + build. _Why after step 5:_ `@supabase/ssr` is only freed by B1's
   deletion.
7. **Retire scripts and docs:** re-point/delete `scripts/forgecms-introspect.mjs`
   (I1); retitle `scripts/inspect-forgecms.mjs` (I2); supersede/update J1-J5 and
   the agent rules (J3). _Gate:_ docs no longer instruct anyone to use
   `/admin/api/graphql` or treat `src/app/admin/**` as present.

---

## 5. Open questions

1. **External CDA URL configuration.** Should `getCmsGraphqlUrl()` hardcode
   `https://cms.pghrugby.com/api/graphql`, or read a new env var (name not
   decided: `CMS_GRAPHQL_URL` vs reusing something existing)? The ticket names a
   fixed URL but the repo has no convention for a CMS _base_ env after
   `FORGECMS_API_URL` was retired.
2. **Which `NEXT_PUBLIC_CMS_*` knobs are actually set** on the site's current
   hosting, and therefore must be mirrored on the external instance? The repo's
   `.env.local` is gitignored and could not be read; only `docs/` asserts
   `NEXT_PUBLIC_CMS_PRODUCT_NAME=Pittsburgh Forge`.
3. **Render mode after E1.** With an external, build-time-reachable CDA, should
   the public site be fully static, ISR, or keep the 300s Data Cache tag? Is
   `graceful` still wanted, or should outages fail loudly now that the CMS is a
   separate deploy?
4. **Is the external CDA's standings query compatible?** `standings.query.ts`
   uses nested `where` on `league`/`division`/`season`, while
   `competition.query.ts:7-9` warns nested relation filters silently return
   empty. Confirm against the external schema (introspection) before relying on
   the standings pages.
5. **Media.** No media provider is registered today. Must the external instance
   register Cloudinary (or another) via its media seam before cutover, and is
   `NEXT_PUBLIC_CMS_MEDIA_PROVIDER` needed on the instance?
6. **`CMS_API_TOKEN` value/rotation.** The site no longer validates it (the core
   route did). Confirm the token the site will send matches the key configured on
   `cms.pghrugby.com`, and whether it should be rotated as part of the move.
7. **Supabase shared or split?** Does the external CMS keep using this site's
   Supabase project (`knqlsiuhdcflazlnefob`) indefinitely? If it moves, the
   site's `NEXT_PUBLIC_SUPABASE_URL` for orders/carts and the CMS's content DB
   diverge, and `scripts/inspect-forgecms.mjs` / `docs/agents/supabase-postgrest.md`
   change meaning.
8. **`@supabase/ssr` / `graphql` real usage.** `@supabase/ssr` looks solely
   tied to `src/proxy.ts`; `graphql` showed no non-admin import. Confirm before
   dropping (peer deps, transitive use).
9. **`robots.ts` intent.** After `/admin` is no longer served here, should the
   site keep a `robots.txt` at all, and with what rules?
10. **`netlify.toml` after cutover.** The secrets-scan omit list is unrelated to
    CMS, but confirm no new scan friction arises from `CMS_API_TOKEN` on the
    external-CDA path before changing it.
11. **Instance repo confirms the destination assumptions.** This inventory
    verifies only _this_ repo. The external repo's actual CDA path
    (`/api/graphql` vs `/admin/api/graphql`), key header, and `src/extensions/**`
    layout were not read (out of scope here) and should be confirmed by #94/#97.
