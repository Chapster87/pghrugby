# Handoff: mount forgecms at `/admin` — Option A (single root layout)

> Status: handoff from the forgecms producer side to the pghrugby side.
> Goal: make pghrugby a valid host so `forgecms install .` mounts the CMS core at
> `/admin` and it actually renders. This covers **Option A**: move pghrugby onto
> the standard single-root-layout model.
>
> Related: `forgecms-embed-cms-side-handoff.md` (embed architecture). The consumer
> guide and host contract live in the forgecms repo at `docs/EMBEDDING.md` and
> `docs/HOST-RUNTIME.md`.

## Why this task exists

forgecms vendors the core into a **plain `src/app/admin`** directory, and the core
deliberately ships **no root layout** (html-free). The **host** must provide the
`<html>/<body>` shell (`docs/HOST-RUNTIME.md`). Right now pghrugby cannot serve a
plain `/admin` mount because it has no layout that outputs `<html>` above it.

## Current state (verified)

- **No root layout.** There is no `src/app/layout.tsx`.
- Each route group renders its **own** `<html>`: `(core)/layout.tsx`,
  `(checkout)/layout.tsx`, `(plugin)/layout.tsx`. `(checkout)` carries a comment
  explaining the group needs its own html for its embedded context.
- `src/app` route groups: `(core)`, `(checkout)`, `(plugin)`; plus a **stray,
  partial `src/app/admin`** left from an earlier aborted forgecms install (no
  `forgecore.json` marker).
- **No `src/proxy.ts` / `middleware.ts`** (the host page gate doesn't exist yet;
  forgecms will scaffold one on install).
- `tsconfig.json` aliases present: `@/*`, `@components/*`, `@fragments/*`,
  `@layouts/*`, `@lib/*`, `@modules/*`, `@styles/*`, `@svg/*`, `@types/*`.
  Missing vs. the core's expected set: `~/*`, `@helpers/*`, `@customTypes/*`,
  `@client/*`.

## Decision (Option A)

Adopt the standard Next App Router shape:

1. Add **one root layout** `src/app/layout.tsx` that renders `<html lang>` /
   `<body>` + global CSS/fonts and `{children}`.
2. Convert the three group layouts (`(core)`, `(checkout)`, `(plugin)`) to **stop
   emitting `<html>`** — keep their providers/nav/chrome as non-html wrappers so
   they nest under the root layout.
3. `/admin` (and every route) then inherits a single document shell.

This is what forgecms expects a host to look like and is the durable fix. (The
alternative — keeping per-group html and embedding the core inside one shell
group — is Option B, not chosen here.)

## Steps

1. **Remove the stray partial install** (start clean; the real install rewrites it):
   ```sh
   rm -rf src/app/admin
   ```
2. **Add the root layout** `src/app/layout.tsx`:
   - render `<html lang>` / `<body>` with pghrugby's global CSS/fonts and
     `{children}`;
   - move any app-wide providers/theme that currently live duplicated in each
     group layout up here (or keep them per-group as non-html wrappers — decide
     per concern: html/fonts/global css go to root; per-shell chrome may stay in
     the group wrapper).
3. **Edit the three group layouts** to remove their `<html>/<body>` tags, keeping
   the rest of their content as a fragment/wrapper around `{children}`.
4. **Verify the refactor alone**: `pnpm dev` (or `pnpm build`) must succeed and
   the existing routes under `(core)`, `(checkout)`, `(plugin)` must render with
   correct html. This is the checkpoint — pghrugby should be a valid Next tree
   *before* forgecms is introduced.
5. **tsconfig aliases for the core.** Ensure the core's imports resolve under
   `./src/app/admin/*`. pghrugby must add the missing aliases and confirm the
   existing ones don't collide:
   - Missing to add (pointing into the mounted core): `~/*`, `@helpers/*`,
     `@customTypes/*`, `@client/*`.
   - **Audit for collision:** pghrugby's `@components/*`, `@lib/*`, etc. point at
     pghrugby's own folders. If the vendored core imports those same names
     expecting its *own* copies under `admin/`, that's a conflict. Check whether
     the core's cross-file imports are relative (within `admin/`) or use the
     aliases; mirror only what the core actually uses, and resolve any overlap
     before running the app.
6. **Provide env.** Put `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`,
   pointing at pghrugby's compatible DB (it already runs the core substrate, so
   no provisioning; converge is idempotent).
7. **Install (dry-run then real).** From pghrugby root:
   ```sh
   npx forgecms install . --dry-run
   npx forgecms install .
   ```
   forgecms will vendor `src/app/admin/**`, write a `forgecore.json` marker, and
   scaffold `src/proxy.ts` (the host page gate). It must exempt `/admin/auth`
   and `/admin/api/*`.
8. **Verify.**
   - `pnpm build` / `pnpm dev`.
   - HOST-RUNTIME smoke checks: `/` → `200`; signed-out `/admin/...` UI →
     `307 /admin/auth`; `/admin/auth` → `200`; a data API (no session) → `401`.
   - Sign in and load an admin page in the browser.

## Constraints / guardrails

- Do not edit anything inside the **core subtree** (`src/app/admin/**` once
  mounted) — it's wholesale-overwritten on update. All host work happens in the
  shell (root layout, group wrappers, `src/proxy.ts`, `tsconfig.json`,
  `.env.local`).
- Only one layout in the tree may emit `<html>` (the root). Group layouts become
  non-html wrappers.
- Keep the refactor (steps 1–4) green before running forgecms (step 7), so any
  failure afterward is attributable to the mount, not the layout change.
- The core ships no root layout and no global middleware by design; both are
  host-owned.

## Definition of done

- `pnpm build` green on pghrugby (with the root layout + converted groups).
- `forgecms install .` completes and writes `forgecore.json`.
- `/admin` renders and is gated correctly (signed-out → `/admin/auth`); the four
  HOST-RUNTIME smoke checks pass.
