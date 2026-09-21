# Railway platform inventory — the CMS instance

Status: **verified 2026-09-21** unless a line says otherwise. Companion to
[forgecms-instance-operations.md](./forgecms-instance-operations.md) (the generator's
contract and the update ritual) on the wayfinder map
[Wayfinder map: Site uses external data from cms.pghrugby.com (#89)](https://github.com/Chapster87/pghrugby/issues/89).

This file is the **platform half** of the instance: what is configured on Railway, which
is to say everything the generator's manifest cannot hold and no `forgecms update` can
touch. It was rewritten on 2026-09-21 — its previous subject was the **retired Medusa
stack**, which is dead and decommissioned, and its service list, Postgres, Redis and
billing are gone with it. Nothing here concerns the Medusa project.

## 1. The project

| Setting                 | Value                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Railway project         | `pghrugby-cms`                                                                                                                                                            |
| Service                 | `pghrugby-cms`                                                                                                                                                            |
| Environment             | `production`                                                                                                                                                              |
| Region                  | `us-east4-eqdc4a` (US East — chosen to be close to the Supabase project, so CDA reads are not paying a cross-region round trip)                                           |
| Builder                 | **Railpack**, the generator's own `next build` / `next start`. No platform adapter.                                                                                       |
| Host config in the repo | **None.** No `Dockerfile`, `railway.json`, `nixpacks.toml`, `Procfile` or CI. Configuration is service variables, by design — see the boundary rule in the companion doc. |

Project id recorded at stand-up: `608afd95-482d-4ca3-b12b-9109bf8e48cd`.

## 2. The public surface

- **Origin** `https://cms.pghrugby.com`. The app is served at the **root** of its own
  origin — the admin is at `/`, the editor at `/editor`, the schema builder at `/schema`.
  There is no mount prefix and no base-path setting.
- **DNS** `pghrugby.com` is **Cloudflare-managed** (`donald.ns.cloudflare.com`,
  `erin.ns.cloudflare.com`). The `cms` record is a **CNAME → `qi96newp.up.railway.app`**,
  resolving unproxied (verified by lookup 2026-09-21), which is what lets Railway issue
  and serve the certificate.
- **TLS** Railway-issued (Let's Encrypt). No Cloudflare proxy in front of the app.
- **The CDA root the site consumes** is `https://cms.pghrugby.com/api/graphql` —
  server-to-server, `POST` with `x-api-key`. No CORS, no base path.

> Correction worth carrying: [Grilling: Deploy target and custom domain for the CMS
> instance (#98)](https://github.com/Chapster87/pghrugby/issues/98)'s resolution describes
> the DNS as Dreamhost. It is not — it is Cloudflare, as the map's own 2026-09-15
> correction records and the nameserver lookup above confirms. The decision (Railway, a
> plain CNAME) is unaffected; only that sentence is wrong.

## 3. The branch and the build

- **Deploy source:** the instance repo's default branch. The checkout shows `trunk` as
  HEAD with `main` at the same commit, and the stand-up notes record `main` — the two name
  the same commit today, so this is a naming detail to confirm rather than a conflict.
- **Install:** `pnpm install --frozen-lockfile`, with `CI=true`. pnpm 10 is selected by
  the manifest's `packageManager` field (Railpack's own default is pnpm 9). **A manifest
  that has drifted from `pnpm-lock.yaml` fails the build** — see the ritual in the
  companion doc.
- **Node:** resolved by Railpack, defaulting to the alias `lts` — a moving target. Pinned
  by a root `.nvmrc` in the instance as of 2026-09-21; `RAILPACK_NODE_VERSION` on this
  service is the equivalent alternative, and the two must not both be set.
- **Start:** the manifest's `start` script (`next start`), which reads the injected
  `PORT` itself — no `-p $PORT` needed.

## 4. Service variables

**Must exist at build time, not only at run time** — `next build` inlines them and the
build fails without them:

| Variable                        | Role                                            |
| ------------------------------- | ----------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable/anon key (browser-safe, RLS-scoped) |

Required at runtime:

| Variable        | Role                                                                                                                                                |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CMS_DB_KEY`    | The scoped server credential (a secret key whose JWT template sets `role: forgecms`). The app **refuses to boot** if it resolves to any other role. |
| `CMS_API_TOKEN` | The delivery key the CDA requires. The app **refuses to start** with it unset.                                                                      |

Optional, by feature:

| Variable                                                                                                     | Role                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CMS_PREVIEW_TOKEN`                                                                                          | Unlocks `preview` / `includeDrafts` on the CDA                                                                                                               |
| `NEXT_PUBLIC_CMS_PRODUCT_NAME`, `NEXT_PUBLIC_CMS_GLOBALS_CMS_SETTINGS_KEY`, `NEXT_PUBLIC_CMS_MEDIA_PROVIDER` | Branding and media-provider defaults                                                                                                                         |
| `CMS_WEBHOOK_URL`, `CMS_WEBHOOK_SECRET`                                                                      | **The publish signal.** Set as of 2.2.0 (ADR-0009): a signed, content-free POST emitted on publish/unpublish/delete. Unset means the instance emits nothing. |
| `CMS_WEBHOOK_TRIGGER_TOKEN`                                                                                  | Optional bearer token for the manual webhook trigger                                                                                                         |
| the media provider's server credential                                                                       | Whatever the club's registered server-half media provider needs, declared in `src/extensions/register-server.ts`                                             |

Delivery is best-effort — one attempt plus one retry, no queue — and runs after the
response, so a miss degrades to the site's staleness window. The receiver is the site's
own endpoint; the instance holds no knowledge of it beyond the URL.

## 5. What must never be on the service

- `SUPABASE_SERVICE_ROLE_KEY` — **operator-only.** It is what the `forgecms` CLI's
  convergence, the instance's `pnpm db:migrate` and the local MCP server use, and it is
  exactly what the shared-project isolation guards exist to keep out of the app.
- `SUPABASE_LEGACY_JWT_SECRET` — operator-only for a sharper reason: it can sign a JWT
  for any role.

## 6. Scheduled work

**Nothing is scheduled.** Two jobs belong here and neither exists yet:

- **Audit-log retention** — `pnpm db:prune-audit-logs`, daily off-peak per
  `docs/DEPLOY.md`. The log is append-only for every request-path role, so nothing the app
  does bounds it. It needs `SUPABASE_SERVICE_ROLE_KEY` and refuses the app's `CMS_DB_KEY`
  by design, so it is operator-side work; filed as its own Task under the map.
- Nothing else. The instance holds no cron, no queue and no scheduler of its own.

## 7. What is deliberately not here

- **The site.** It runs on Netlify; the CMS and the site are on separate hosts on purpose,
  so their failure domains and their bills are separate. See
  [Wayfinder map: The site serves from a green Netlify deploy (#78)](https://github.com/Chapster87/pghrugby/issues/78).
- **Supabase.** Shared project, neither app's host.
- **Any club setting that would otherwise sit inside an owned `package.json` key.** The
  boundary rule: manifest for what upstream ships, Railway for everything else, nothing
  in both.

## 8. Open items

- Confirm the deploying branch name (`trunk` vs `main`).
- Confirm the Node line the service actually runs, against the `.nvmrc` added 2026-09-21,
  on the next deploy's build log.
- Set a spending limit on the project (a hold-the-line measure carried from
  [Task: Land the shared-project isolation guards before the CMS is cut over (#101)](https://github.com/Chapster87/pghrugby/issues/101)).
- Schedule the retention job (§6).
