# ForgeCMS auth + CDA gating surface (embedded core)

Status: **decided 2026-09-10** for
[Decide: auth + CDA gating surface under /admin](https://github.com/Chapster87/pghrugby/issues/51)
on
[Wayfinder map: Embed the ForgeCMS content software into the pghrugby app](https://github.com/Chapster87/pghrugby/issues/40).

Companion env/build surface:
[forgecms-env-build-surface.md](./forgecms-env-build-surface.md).

This document locks the **host gating model** now that `/admin` lives inside the
public Next.js app. No host code change was required — the shipped split is the
end state.

---

## Headline

| Concern                     | Owner                                    | End state                                            |
| --------------------------- | ---------------------------------------- | ---------------------------------------------------- |
| Admin UI page gate          | Host `src/proxy.ts`                      | Signed-out UI → **307** `/admin/auth`                |
| Admin data APIs (CMA-style) | Core route handlers under `/admin/api/*` | No session → **401**                                 |
| Public CDA                  | Core `POST /admin/api/graphql`           | `x-api-key: CMS_API_TOKEN` **or** editor session     |
| Admin identity              | Core `/admin/auth` (Supabase)            | Google OAuth + optional email/password               |
| Host identity substitute    | —                                        | **Out of scope** — do not front or replace core auth |

---

## 1. Page gate vs data gate

**Decision: keep the split.**

### Host page gate (`src/proxy.ts`)

- Matcher covers almost all paths (static assets excluded).
- **Admin UI** = path under `CMS_MOUNT_PATH` (`/admin`) **except**
  `/admin/auth*` and `/admin/api*`.
- If Supabase `getUser()` is empty **and** the request is admin UI →
  `NextResponse.redirect(.../admin/auth)`.
- Auth pages and all `/admin/api/*` are **exempt** from the redirect (they must
  not bounce machines or the sign-in form itself).

### Core data gate

- CMA-style routes (`/admin/api/models`, blocks, schema, …) call Supabase
  session/user and return **401** when unsigned.
- CDA (`/admin/api/graphql`) authorizes if:
  1. `x-api-key` matches `CMS_API_TOKEN`, **or**
  2. a valid Supabase session is present.
- Otherwise **401** when `CMS_API_TOKEN` is configured.

### Why not collapse

| Collapse                        | Failure mode                                                            |
| ------------------------------- | ----------------------------------------------------------------------- |
| Proxy redirects `/admin/api/*`  | Breaks CDA clients, scripts, and SPA fetches (need 401, not HTML login) |
| 401-only admin UI (no redirect) | Bad editor UX; HOST-RUNTIME expects 307 to `/admin/auth`                |

### HOST-RUNTIME contract (unchanged)

Verified on mount (#47); still the definition of done for this model:

| Check                                                   | Expected            |
| ------------------------------------------------------- | ------------------- |
| `GET /`                                                 | 200                 |
| Signed-out `GET /admin` (or other UI)                   | 307 → `/admin/auth` |
| `GET /admin/auth`                                       | 200                 |
| Data API without session (e.g. `GET /admin/api/models`) | 401                 |

CDA without key/session is also 401 (same family as data gate; not a separate
smoke row).

---

## 2. Admin identity

**Decision: keep core `/admin/auth` (Supabase).** Do **not** substitute a
host-owned IdP in front of the admin.

### What the host owns

| Item                            | Role                                                                       |
| ------------------------------- | -------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project                                                           |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser/server auth client                                                 |
| `SUPABASE_SERVICE_ROLE_KEY`     | Core server routes (RLS bypass where intended)                             |
| Supabase dashboard              | Site URL + redirect allow-list for this host (e.g. `/admin/auth/callback`) |
| Google provider in Supabase     | OAuth client wired **in Supabase**, not via host env Google keys           |

### What the core owns (vendored; do not edit)

- `/admin/auth` UI (Google OAuth + email/password form)
- `/admin/auth/callback` code exchange
- Session cookies via `@supabase/ssr` helpers inside the mount

### Not admin auth (public-site Google keys)

These live in host env and are **unrelated** to `/admin/auth`:

| Variable                                | Consumer                           | Purpose                                  |
| --------------------------------------- | ---------------------------------- | ---------------------------------------- |
| `GOOGLE_CALENDAR_API_KEY`               | `src/app/(core)/calendar/page.tsx` | Google Calendar Data API for `/calendar` |
| `NEXT_PUBLIC_GOOGLE_RECAPTCHA_SITE_KEY` | `src/components/contact-form`      | reCAPTCHA site key on the contact form   |

Admin “Sign in with Google” is Supabase `signInWithOAuth({ provider: "google" })`
→ `/admin/auth/callback`. It does **not** read either of those keys.

### Why not host identity

The core subtree is wholesale-overwritten on `forgecms update`. A host-owned
session layer would fight the mount, dual-stack sessions, or require producer
auth seams that do not exist. Editors are a small set; the proven Supabase path
is enough.

---

## 3. Public CDA delivery surface

**Decision: keep the embedded mount endpoint** (same as
[Decide: env + build consolidation with the core mounted](https://github.com/Chapster87/pghrugby/issues/49)).

| Fact          | Value                                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| URL           | `${NEXT_PUBLIC_BASE_URL}/admin/api/graphql`                                                           |
| Auth header   | `x-api-key: CMS_API_TOKEN`                                                                            |
| Host constant | `CMS_MOUNT_PATH = "/admin"` in `src/lib/forgecms/execute-query.ts` (mirrors proxy + `forgecore.json`) |
| Site client   | `executeQuery` in `src/lib/forgecms/execute-query.ts`                                                 |
| Scripts       | e.g. `scripts/forgecms-introspect.mjs`                                                                |

### Rejected for this host

| Option                                       | Why not                                                   |
| -------------------------------------------- | --------------------------------------------------------- |
| Host alias (e.g. `/api/cms/graphql`)         | Extra hop, no security gain; core remains source of truth |
| Separate ForgeCMS process / external CDA URL | Retired by #49 (`FORGECMS_API_*` removed)                 |

### Coexistence with DatoCMS

The public app has **two content clients**; they do not share a route gate:

| Client       | Path                                                  | Typical consumers                                              |
| ------------ | ----------------------------------------------------- | -------------------------------------------------------------- |
| ForgeCMS CDA | `@/lib/forgecms/execute-query` → `/admin/api/graphql` | links, contact socials, standings, other Forge-backed surfaces |
| DatoCMS CDA  | `@/lib/datocms/executeQuery` → DatoCMS cloud          | home, pages, posts, membership, etc.                           |

Which CMS owns which **page** is content architecture (other maps/tickets). This
decision only locks **how** ForgeCMS content is fetched and gated on this host.

---

## 4. Host invariants (do not break)

1. **Never edit** `src/app/admin/**` for auth or CDA gating — update via
   `forgecms` only.
2. **`src/proxy.ts` stays shell-owned** — keep UI redirect + auth/api exemptions.
3. **CDA stays on the mount path** with `CMS_API_TOKEN`; do not reintroduce
   `FORGECMS_API_URL` / `FORGECMS_API_TOKEN`.
4. **Do not** wire `GOOGLE_CALENDAR_API_KEY` or reCAPTCHA into admin auth.
5. After proxy or env changes that touch this model, re-run the four HOST-RUNTIME
   smokes above.

---

## Related decisions

- Mount + HOST-RUNTIME green:
  [Task: Verify the mounted forgecms admin (HOST-RUNTIME)](https://github.com/Chapster87/pghrugby/issues/47)
- Env + CDA URL:
  [Decide: env + build consolidation with the core mounted](https://github.com/Chapster87/pghrugby/issues/49)
  → [forgecms-env-build-surface.md](./forgecms-env-build-surface.md)
