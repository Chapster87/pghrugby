# Environment and Secrets Inventory

Status: **verified 2026-08-24** from code references + local env _names_ (values never recorded here).

Part of the wayfinder map: [Wayfinder map: Single-repo Next.js site on Stripe + DatoCMS + ForgeCMS](https://github.com/Chapster87/pghrugby/issues/1) — ticket [Task: Environment and secrets inventory](https://github.com/Chapster87/pghrugby/issues/7).

Companion: [railway-inventory.md](./railway-inventory.md) (Railway-hosted Medusa stack env surface).

## 1. Scope

Three runtime surfaces today, collapsing to **one** (`pghrugby/nextjs`) after Medusa/Sanity/Strapi removal:

| Surface           | Path                                            | Role today                          | End state                                |
| ----------------- | ----------------------------------------------- | ----------------------------------- | ---------------------------------------- |
| Next.js app       | `pghrugby` (repo root)                          | Live site + storefront + prototypes | **Keep** — sole app                      |
| Medusa backend    | `pghrugby-store`                                | Commerce API on Railway             | **Delete** with Medusa                   |
| Strapi            | `pghrugby/strapi`                               | Abandoned CMS experiment            | **Delete**                               |
| Migration scripts | `pghrugby/migrations/*`, `migrations/import-wp` | One-shot WP → CMS                   | Keep only while WP content still landing |

## 2. Before — full inventory (today)

### 2.1 Next.js (`pghrugby/nextjs`) — present in `.env.local`

| Variable                                            | Used by                                                                              | Family               | Fate                                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------- | -------------------------------------------------------------------------------------- |
| `MEDUSA_BACKEND_URL`                                | `src/lib/config.ts`, `src/middleware.ts`                                             | Medusa               | **Die**                                                                                |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`                | `src/lib/config.ts`, middleware, `check-env-variables.js`                            | Medusa               | **Die**                                                                                |
| `NEXT_PUBLIC_MEDUSA_DEFAULT_COUNTRY_CODE`           | store/category/collection/product pages                                              | Medusa               | **Die**                                                                                |
| `NEXT_PUBLIC_DEFAULT_REGION`                        | `src/middleware.ts`                                                                  | Medusa region        | **Die** (with Medusa regions)                                                          |
| `NEXT_PUBLIC_BASE_URL`                              | `src/lib/util/env.ts`, prototype Stripe return URLs                                  | Site                 | **Stay**                                                                               |
| `NEXT_PUBLIC_STRIPE_KEY`                            | Medusa checkout payment-wrapper                                                      | Stripe (legacy name) | **Consolidate** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`                                 |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`                | prototype embedded Checkout                                                          | Stripe               | **Stay**                                                                               |
| `STRIPE_SECRET_KEY`                                 | prototype Checkout Session + webhook                                                 | Stripe               | **Stay**                                                                               |
| `STRIPE_WEBHOOK_SECRET`                             | prototype webhook signature verify                                                   | Stripe               | **Stay**                                                                               |
| `RESEND_API_KEY` (was `NEXT_PUBLIC_RESEND_API_KEY`) | `api/send-contact-email`                                                             | Resend               | **Stay** — server-only; rename done 2026-08-24                                         |
| `RESEND_FROM_EMAIL`                                 | contact form `from` (default `web@pghrugby.com`)                                     | Resend               | **Stay**                                                                               |
| `NEXT_PUBLIC_GOOGLE_API_KEY`                        | `calendar/page.tsx`                                                                  | Google Calendar      | **Stay**                                                                               |
| `NEXT_PUBLIC_GOOGLE_RECAPTCHA_SITE_KEY`             | `components/contact-form`                                                            | reCAPTCHA            | **Stay**                                                                               |
| `NEXT_PUBLIC_SANITY_PROJECT_ID`                     | Sanity client/env/cli, image URLs                                                    | Sanity               | **Die** (after Sanity teardown)                                                        |
| `NEXT_PUBLIC_SANITY_DATASET`                        | Sanity client/env                                                                    | Sanity               | **Die**                                                                                |
| `NEXT_PUBLIC_SANITY_API_VERSION`                    | Sanity client/env                                                                    | Sanity               | **Die**                                                                                |
| `NEXT_PUBLIC_SANITY_STUDIO_URL`                     | Sanity client/env                                                                    | Sanity               | **Die**                                                                                |
| `SANITY_VIEWER_TOKEN`                               | draft-mode enable, Sanity live                                                       | Sanity               | **Die**                                                                                |
| `STRAPI_GRAPHQL_ENDPOINT`                           | `src/lib/data/strapi.ts`                                                             | Strapi               | **Die**                                                                                |
| `FORGECMS_API_URL`                                  | `src/lib/forgecms/execute-query.ts`                                                  | ForgeCMS             | **Stay**                                                                               |
| `FORGECMS_API_TOKEN`                                | ForgeCMS GraphQL `x-api-key`                                                         | ForgeCMS             | **Stay**                                                                               |
| `DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN`               | `src/lib/datocms/executeQuery.ts`                                                    | DatoCMS              | **Stay**                                                                               |
| `DATOCMS_DRAFT_CONTENT_CDA_TOKEN`                   | draft/preview queries                                                                | DatoCMS              | **Stay**                                                                               |
| `DATOCMS_BASE_EDITING_URL`                          | draft content-link overlays                                                          | DatoCMS              | **Stay**                                                                               |
| `DATOCMS_CMA_TOKEN`                                 | in `.env.local`; not referenced in app src                                           | DatoCMS CMA          | **Stay** (migrations / schema gen / admin scripts)                                     |
| `DATACMA_FULL_API_TOKEN`                            | in `.env.local` only — **orphan alias**                                              | DatoCMS              | **Drop or rename** → use `DATOCMS_CMA_TOKEN`                                           |
| `SECRET_API_TOKEN`                                  | in `.env.local` only — **no code refs**                                              | Unknown              | **Audit / drop**                                                                       |
| `REVALIDATE_SECRET`                                 | in `.env.local` only — invalidate-cache route referenced in comments but **missing** | Cache webhook        | **Stay (planned)** — wire when DatoCMS webhook route lands                             |
| `NEXT_PUBLIC_SUPABASE_URL`                          | in `.env.local`; not yet imported in app src                                         | Supabase orders      | **Stay** (required for `orders`)                                                       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`                     | in `.env.local`; not yet imported                                                    | Supabase             | **Stay** (browser/anon if ever needed; orders write path uses service role)            |
| `SUPABASE_SERVICE_ROLE_KEY`                         | in `.env.local`; not yet imported                                                    | Supabase orders      | **Stay** — **required** for `recordOrder` (RLS on, zero policies; service-role bypass) |
| `WORDPRESS_APP_USERNAME`                            | WP migration scripts                                                                 | Migration            | **Stay until WP content confirmed landed**                                             |
| `WORDPRESS_APP_PASSWORD`                            | WP migration scripts                                                                 | Migration            | **Stay until WP content confirmed landed**                                             |

Also referenced in code but not always in `.env.local`:

| Variable                 | Used by           | Fate                                                   |
| ------------------------ | ----------------- | ------------------------------------------------------ |
| `NEXT_PUBLIC_VERCEL_URL` | `next-sitemap.js` | Optional host; prefer `NEXT_PUBLIC_BASE_URL` long-term |
| `NODE_ENV`               | framework         | Stay (set by runtime)                                  |

### 2.2 Medusa (`pghrugby-store`) — dies entirely

| Variable                                                     | Role                                                                                                                    |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                               | Railway Postgres                                                                                                        |
| `REDIS_URL`                                                  | Railway Redis (often unset locally)                                                                                     |
| `MEDUSA_WORKER_MODE`, `PORT`, `DISABLE_MEDUSA_ADMIN`         | Process shape                                                                                                           |
| `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS`                      | CORS                                                                                                                    |
| `JWT_SECRET`, `COOKIE_SECRET`                                | Auth/session                                                                                                            |
| `MEDUSA_BACKEND_URL`                                         | Admin backend URL                                                                                                       |
| `STRIPE_API_KEY`                                             | **Test-mode sandbox** `acct_1RT7eIR1ZGc2p07H` — empty, dead weight ([stripe-catalog-spec.md](./stripe-catalog-spec.md)) |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`                        | Medusa notification module                                                                                              |
| `SANITY_API_TOKEN`, `SANITY_PROJECT_ID`, `SANITY_STUDIO_URL` | Medusa↔Sanity sync module                                                                                               |
| `MEDUSA_ADMIN_ONBOARDING_TYPE`                               | Starter leftover                                                                                                        |

When Medusa goes: delete `pghrugby-store/.env*`, Railway service env vars, and stop using `STRIPE_API_KEY` (Next.js uses `STRIPE_SECRET_KEY` on the **live** Stripe account instead).

### 2.3 Strapi (`pghrugby/strapi`) — dies entirely

Standard Strapi secrets only (`HOST`, `PORT`, `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `ENCRYPTION_KEY`, `JWT_SECRET`, optional `DATABASE_*`). Local `.env` points at sqlite-style defaults. No production dependency.

### 2.4 Migration-only

| Variable                                           | Scripts                                      |
| -------------------------------------------------- | -------------------------------------------- |
| `WORDPRESS_URL` (default `https://pghrugby.com`)   | `migrations/dato-cms/*`                      |
| `WORDPRESS_APP_USERNAME`, `WORDPRESS_APP_PASSWORD` | dato-cms + strapi + `migrations/import-wp`   |
| `DATOCMS_API_TOKEN`, `DATOCMS_ENVIRONMENT`         | `migrations/dato-cms/*` (alias of CMA token) |
| `STRAPI_API_KEY`                                   | `migrations/strapi/*`                        |

Preserve until WordPress content is confirmed landed (map standing preference). Then delete.

## 3. After — target env for the single Next.js app

### 3.1 Required at runtime (production)

```bash
# Site
NEXT_PUBLIC_BASE_URL=

# Stripe (live account — catalog + embedded Checkout + webhook)
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Supabase website project (orders table; ref knqlsiuhdcflazlnefob)
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
# Optional if any client-side Supabase read is added later:
# NEXT_PUBLIC_SUPABASE_ANON_KEY=

# DatoCMS (editorial + interim product content)
DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN=
DATOCMS_DRAFT_CONTENT_CDA_TOKEN=
DATOCMS_BASE_EDITING_URL=
# CMA for schema gen / migrations (server/dev only):
DATOCMS_CMA_TOKEN=

# ForgeCMS (chrome + competition)
FORGECMS_API_URL=
FORGECMS_API_TOKEN=

# Resend (contact form today; order email later if needed)
RESEND_API_KEY=
RESEND_FROM_EMAIL=web@pghrugby.com

# Google
NEXT_PUBLIC_GOOGLE_API_KEY=
NEXT_PUBLIC_GOOGLE_RECAPTCHA_SITE_KEY=

# Cache invalidation (when invalidate-cache route is implemented)
REVALIDATE_SECRET=
```

The Stripe trio can be toggled between accounts with `STRIPE_ENV` (server) / `NEXT_PUBLIC_STRIPE_ENV` (client, build-time). Each key prefers a `_LIVE`/`_TEST`-suffixed name when set (`STRIPE_SECRET_KEY_LIVE`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE`, `STRIPE_WEBHOOK_SECRET_LIVE`, and the `_TEST` counterparts), falling back to the canonical names above — so local `.env.local` can hold both pairs and flip the selector, while production hosting sets the canonical trio (or the `_LIVE` names) with `STRIPE_ENV=live`. The checkout session builder uses live Price IDs only when `STRIPE_ENV=live`; test mode falls back to inline `price_data`.

### 3.2 Naming cleanups (do during Medusa/checkout productionization)

| Today                        | Target                                              | Why                                                                                                                |
| ---------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_STRIPE_KEY`     | drop; use only `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | One publishable key name                                                                                           |
| `NEXT_PUBLIC_RESEND_API_KEY` | `RESEND_API_KEY` (server-only)                      | **Done 2026-08-24** — contact route + local/Netlify env renamed; submitter is `replyTo`, verified domain is `from` |
| `DATACMA_FULL_API_TOKEN`     | drop; use `DATOCMS_CMA_TOKEN`                       | Orphan alias                                                                                                       |
| `SECRET_API_TOKEN`           | drop unless a consumer is found                     | No code references                                                                                                 |
| Medusa `STRIPE_API_KEY`      | never port to Next                                  | Wrong account (empty sandbox)                                                                                      |

### 3.3 Dies with removals (checklist)

**Medusa removal**

- `MEDUSA_BACKEND_URL`
- `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_MEDUSA_DEFAULT_COUNTRY_CODE`
- `NEXT_PUBLIC_DEFAULT_REGION`
- Entire `pghrugby-store` env set + Railway vars
- `check-env-variables.js` Medusa requirement (rewrite or delete)

**Sanity teardown** ([Task: Sanity teardown](https://github.com/Chapster87/pghrugby/issues/21))

- `NEXT_PUBLIC_SANITY_*`
- `SANITY_VIEWER_TOKEN`
- Medusa's `SANITY_*` (goes with store)

**Strapi removal**

- `STRAPI_GRAPHQL_ENDPOINT`
- `STRAPI_API_KEY` (migrations)
- Entire `pghrugby/strapi/.env*`

**After WP migration confirmed**

- `WORDPRESS_APP_USERNAME`, `WORDPRESS_APP_PASSWORD`, `WORDPRESS_URL`

### 3.4 Supabase `orders` — required secrets

From the locked schema ([orders migration](../../pghrugby/supabase/migrations/20260824000000_create_orders.sql)):

- Table lives in website Supabase project **`knqlsiuhdcflazlnefob`**.
- RLS enabled, **zero policies** → only the **service role** can read/write.
- App write path: shared `recordOrder` (return page + webhook) using `SUPABASE_SERVICE_ROLE_KEY` + `NEXT_PUBLIC_SUPABASE_URL`.
- Do **not** expose the service role to the browser. Anon key is optional until an authenticated admin read path exists (out of scope per map).

Prototype spike still uses in-memory store; wiring these env vars into a real Supabase client is part of checkout productionization, not this inventory.

## 4. Committed DatoCMS token — handled

**Finding:** `pghrugby/package.json` script `generate-schema` embedded a DatoCMS API token in the `Authorization: Bearer …` header (committed to git).

**Code fix (this ticket):**

- Removed the hardcoded Bearer token from `package.json`.
- `generate-schema` now runs `node ./scripts/generate-datocms-schema.mjs`, which loads `DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN` (fallback `DATOCMS_CMA_TOKEN` / `DATOCMS_API_TOKEN`) from `.env.local`.

**HITL — rotate the leaked token (do this now):**

1. DatoCMS project → Settings → API tokens.
2. Revoke/rotate the token that matches the old committed value (treat it as public).
3. Create a replacement with the minimum scope needed (CDA published read for schema gen; separate tokens for draft CDA and CMA as you already have).
4. Update local `.env.local` and any host env (Vercel/Cloudinary/etc.) with the new values.
5. Confirm `pnpm generate-schema` still works.
6. If this repo is or was public, assume the old token was scraped — rotation is mandatory, not optional.

## 5. Hosting env checklist

Wherever the Next.js app is deployed, set the **§3.1** block. Do **not** set Medusa/Sanity/Strapi vars on the new host.

Railway Medusa service env vars are deleted with the Railway project ([railway-inventory.md](./railway-inventory.md) §4–5).

## 6. Facts recorded

- Single end-state app env is Stripe + Supabase orders + DatoCMS + ForgeCMS + Resend + Google (Calendar/reCAPTCHA) + base URL + revalidate secret.
- Entire Medusa and Strapi env surfaces are disposable.
- Sanity env dies with teardown ticket, not before (site still reads Sanity for remaining types).
- Supabase service role is mandatory for `orders`; anon is not required for the locked write path.
- Hardcoded DatoCMS token removed from `package.json`; **human must rotate the leaked token in DatoCMS**.
- Orphans to clean: `DATACMA_FULL_API_TOKEN`, `SECRET_API_TOKEN`; Resend key should stop using `NEXT_PUBLIC_`.
