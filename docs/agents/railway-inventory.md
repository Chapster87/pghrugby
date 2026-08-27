# Railway Inventory and Decommission Plan

Status: **verified 2026-08-24** (repo evidence + human dashboard check).

Part of the wayfinder map: [Wayfinder map: Single-repo Next.js site on Stripe + DatoCMS + ForgeCMS](https://github.com/Chapster87/pghrugby/issues/1) — ticket [Task: Railway inventory and decommission plan](https://github.com/Chapster87/pghrugby/issues/6).

## 1. What runs on Railway

The Railway project is dashboard-configured — no `railway.json`, `Dockerfile`, `nixpacks.toml`, or `.railway` config lives in this repo. Build is Nixpacks against `pghrugby-store` (`predeploy: medusa db:migrate`, then `start: medusa start`).

### Project canvas (verified)

| Service                                    | Status                           | Notes                                                                                                                                                  |
| ------------------------------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **pghrugby-store-server**                  | Online                           | Medusa HTTP/API + admin. Public host `pghrugby-store-server.up.railway.app` (truncated).                                                               |
| **pghrugby-store-worker**                  | Online                           | Medusa worker process (same repo/image, worker mode).                                                                                                  |
| **Postgres** (`postgres-production-9b85…`) | Online                           | Volume `pest-volume`. Connection host shape `*.proxy.rlwy.net` (seen in local `DATABASE_URL`).                                                         |
| **Redis**                                  | Present (canvas shows Completed) | Volume `hour-volume`. Only Medusa references it; may never have been meaningfully used (Redis-backed modules are commented out in `medusa-config.ts`). |

Nothing else is on this Railway project. **Strapi is not on Railway.** The Next.js frontend is **not** on Railway (user reports Cloudinary for the live frontend/assets path) — decommission scope is this Medusa stack only.

### Medusa service env surface

From `medusa-config.ts` + local `pghrugby-store/.env` (names only — values live in Railway vars / local `.env`, never committed):

| Var                                                          | Role                                                                                                                                                                                                                |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                               | Postgres (required). Local `.env` points at the Railway Postgres proxy.                                                                                                                                             |
| `REDIS_URL`                                                  | Redis. Commented out locally (in-memory fallback); expected set on the Railway services for server/worker split.                                                                                                    |
| `MEDUSA_WORKER_MODE`                                         | `shared` / `worker` / `server` — server + worker services use this to split roles.                                                                                                                                  |
| `PORT`                                                       | `9000` locally                                                                                                                                                                                                      |
| `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS`                      | CORS allow-lists                                                                                                                                                                                                    |
| `JWT_SECRET`, `COOKIE_SECRET`                                | Auth/session secrets (local defaults are placeholders)                                                                                                                                                              |
| `DISABLE_MEDUSA_ADMIN`                                       | Admin UI toggle                                                                                                                                                                                                     |
| `MEDUSA_BACKEND_URL`                                         | Admin backend URL (config default `http://localhost:9000`)                                                                                                                                                          |
| `STRIPE_API_KEY`                                             | **Test-mode** key for Stripe sandbox `acct_1RT7eIR1ZGc2p07H`; verified empty 2026-08-24. Dead weight — cleanup owned by [Task: Environment and secrets inventory](https://github.com/Chapster87/pghrugby/issues/7). |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`                        | Email notification module (`web@pghrugby.com`)                                                                                                                                                                      |
| `SANITY_API_TOKEN`, `SANITY_PROJECT_ID`, `SANITY_STUDIO_URL` | Sanity content module (dataset `production`)                                                                                                                                                                        |

A commented-out Neon `DATABASE_URL` also appears in local `.env` — historical only; active DB is Railway Postgres.

## 2. What depends on Railway

**Only the Next.js frontend's Medusa integration** (`pghrugby/nextjs`) — and only until Medusa is removed from the app:

- `MEDUSA_BACKEND_URL` — Medusa JS SDK base URL (`src/lib/config.ts`) and region/country resolution (`src/middleware.ts`)
- `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` — SDK publishable key
- `NEXT_PUBLIC_MEDUSA_DEFAULT_COUNTRY_CODE` — store/category/collection/product pages
- Runtime calls through `@lib/data/{cart,customer,orders,categories,collections,regions,products}` against the Medusa API

Nothing else in the repo depends on Railway Postgres, Redis, or the Medusa host. Strapi is not deployed here. Frontend hosting is off Railway.

**Local env copies** that die with Medusa: Railway `DATABASE_URL`, Medusa CORS/JWT/cookie/worker vars, and the legacy Stripe test key in `pghrugby-store/.env`. Env cleanup is owned by [Task: Environment and secrets inventory](https://github.com/Chapster87/pghrugby/issues/7).

## 3. Migration paths for anything that must survive

**None.** Confirmed:

- Medusa catalog / DB is **demo only — never used in live** (human confirmation 2026-08-24). Aligns with [stripe-catalog-spec.md](./stripe-catalog-spec.md): live Stripe is a fresh account; the Medusa test key points at an empty sandbox.
- Destination replaces Medusa entirely: Stripe owns catalog + checkout, DatoCMS owns product content, orders land in the website Supabase `orders` table.
- Redis has no consumers outside Medusa and was likely never load-bearing.

Optional safety: take a one-shot `pg_dump` of the Railway Postgres before delete, keep until decommission is confirmed. Not required for a migration path.

## 4. Decommission sequence (cut-off checklist)

Follows the map's replace → verify → delete rule. Execute **after** the frontend no longer talks to Medusa:

1. **Confirm Medusa is unreferenced.** Grep `pghrugby/nextjs` for `MEDUSA_BACKEND_URL`, `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, `@medusajs/js-sdk`, `@lib/data/` Medusa calls. App builds and runs with zero Medusa env vars; store/cart/checkout served from Stripe + DatoCMS.
2. **Optional safety dump** of Railway Postgres (demo data only — skip if not wanted).
3. **Verify zero traffic** to `pghrugby-store-server` (Railway logs) for a short sanity window.
4. **Delete both Medusa services** — `pghrugby-store-server` and `pghrugby-store-worker`. Frontend stays green (step 1).
5. **Delete Redis** (volume `hour-volume`).
6. **Delete Postgres** (volume `pest-volume`).
7. **Cancel Railway billing** (see §5).
8. **Clean local env** — drop Railway `DATABASE_URL`, Medusa vars, legacy Stripe test key from `pghrugby-store/.env` (tracked by [Task: Environment and secrets inventory](https://github.com/Chapster87/pghrugby/issues/7)).

## 5. Billing cancellation

- **Plan:** Hobby, **~$6/month**, next bill **2026-09-01**.
- **Order:** delete services first (steps 4–6), then cancel the plan / delete the project so usage stops before the next cycle.
- This Railway project is the Medusa stack only (no Strapi, no Next.js). Safe to delete the whole project once services are gone, provided the Railway account/team has no other projects you still want.
- After deletion, confirm the Sep 1 cycle closes with no further Railway charges (or a final pro-rate only).

## 6. Facts recorded (verified 2026-08-24)

- Railway hosts exactly four resources: `pghrugby-store-server`, `pghrugby-store-worker`, Postgres (`pest-volume`), Redis (`hour-volume`).
- Medusa never went live; Postgres holds no production data; Redis is Medusa-only and may be unused.
- Strapi is not on Railway. Next.js is not on Railway.
- External integrations on the Medusa services (Stripe test key, Resend, Sanity) are independent of Railway and survive or die on their own tickets — not migration targets for this decommission.
- No Railway manifests in the repo; all wiring is dashboard-side.
- Hobby plan ~$6/mo, next bill 2026-09-01 — cancel after services are deleted.
