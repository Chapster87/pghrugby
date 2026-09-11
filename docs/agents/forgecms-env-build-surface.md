# ForgeCMS env + build surface (embedded core)

Status: **decided 2026-09-10** for
[Decide: env + build consolidation with the core mounted](https://github.com/Chapster87/pghrugby/issues/49)
on
[Wayfinder map: Embed the ForgeCMS content software into the pghrugby app](https://github.com/Chapster87/pghrugby/issues/40).

Values are never recorded here — names, purpose, and consumers only.

## Build

| Fact               | Detail                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| One app            | Single Next.js app at repo root                                                                           |
| One build          | `pnpm build` → `next build` (also `dev` / `start` on port 8000)                                           |
| Mount              | `forgecms install` vendors `src/app/admin/**`; marker `forgecore.json` (`mountPath: "/admin"`)            |
| No standalone path | No second ForgeCMS process, package script, or workspace app in this repo                                 |
| Core subtree       | `src/app/admin/**` is wholesale-overwritten on update — do not edit; host work stays in shell + site libs |

## Required env (ForgeCMS-related)

| Variable                        | Purpose                                                 | Consumed by                                                                                                   |
| ------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                                    | Embedded core + host                                                                                          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key (client/auth)                                  | Embedded core                                                                                                 |
| `SUPABASE_SERVICE_ROLE_KEY`     | Service role (server routes, RLS bypass where intended) | Embedded core API routes                                                                                      |
| `CMS_API_TOKEN`                 | CDA `x-api-key` shared secret                           | Core `src/app/admin/api/graphql`; site `src/lib/forgecms/execute-query.ts`; `scripts/forgecms-introspect.mjs` |

Also required for the site generally (not ForgeCMS-specific): `NEXT_PUBLIC_BASE_URL` — used to build the absolute CDA URL.

## Host constant (not env)

| Name             | Value      | Purpose                                                                          |
| ---------------- | ---------- | -------------------------------------------------------------------------------- |
| `CMS_MOUNT_PATH` | `"/admin"` | Site CDA client + introspect script; mirrors `src/proxy.ts` and `forgecore.json` |

CDA URL:

```text
${NEXT_PUBLIC_BASE_URL}/admin/api/graphql
```

Implemented as `getCmsGraphqlUrl()` in `src/lib/forgecms/execute-query.ts`.

## Optional env (core knobs — unset is fine)

| Variable                                      | Default                                | Purpose                                                           |
| --------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------- |
| `NEXT_PUBLIC_CMS_PRODUCT_NAME`                | `"Content Management"`                 | Admin header / wordmark. **Set on this host:** `Pittsburgh Forge` |
| `NEXT_PUBLIC_CMS_MEDIA_PROVIDER`              | `""` (sole registered provider if any) | Media seam id — useless until the host registers a provider       |
| `NEXT_PUBLIC_CMS_CDA_SITE_SETTINGS`           | enabled (`"true"`)                     | Toggle site-settings CDA surface                                  |
| `NEXT_PUBLIC_CMS_CDA_SOCIAL_SETTINGS`         | enabled                                | Toggle social-settings CDA surface                                |
| `NEXT_PUBLIC_CMS_GLOBALS_SITE_SETTINGS_KEY`   | `site_settings`                        | Globals registry key                                              |
| `NEXT_PUBLIC_CMS_GLOBALS_SOCIAL_SETTINGS_KEY` | `social_settings`                      | Globals registry key                                              |

## Dead / retired by this decision

| Entry                                | Fate                                                                                                                  |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `FORGECMS_API_URL`                   | **Removed.** Was the separate-process base (`http://localhost:3000`). Storefront no longer needs an external CMS URL. |
| `FORGECMS_API_TOKEN`                 | **Removed.** Secret migrated to `CMS_API_TOKEN` (same value).                                                         |
| Separate ForgeCMS runtime on `:3000` | **Not a dependency** of this app. Delivery is the embedded `/admin` mount on the same Next server.                    |

`check-env-variables.js` requires `CMS_API_TOKEN` (+ Supabase anon) instead of the retired pair.

## Still open elsewhere

- Auth + CDA gating surface → **decided** in
  [Decide: auth + CDA gating surface under /admin](https://github.com/Chapster87/pghrugby/issues/51);
  asset [forgecms-auth-cda-gating.md](./forgecms-auth-cda-gating.md).
- Host media provider registration (when media library is needed on this host).
- Broader site secrets inventory (Stripe, DatoCMS, …) remains
  [environment-secrets-inventory.md](./environment-secrets-inventory.md) (pre-dates embed; ForgeCMS rows above supersede its `FORGECMS_API_*` target).
