# Accessing the shared Supabase database (website + ForgeCMS)

The website and ForgeCMS share **one Supabase project** (ref `knqlsiuhdcflazlnefob`).
The same `.env.local` credentials reach both sides:

- Website tables: `orders`, `carts` (RLS-enabled, zero policies — **service role only**).
- ForgeCMS content tables: `matches`, `standings`, `teams`, `leagues`, `seasons`,
  `divisions`, `pages`, `authors`, `sponsors`, `linktree`, `site_navigation`.
- ForgeCMS schema registry: `models` (name → content table) and `fields`
  (columns per model). This registry is the source of truth for field shapes —
  query it before writing to any content table.

## Credentials

`NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` live in `.env.local`
(never read the file directly — pass it via Node's `--env-file` flag). The
service role bypasses RLS, which is required for the website tables and matches
how the ForgeCMS MCP / admin client already works.

## How to query (ad-hoc)

```bash
pnpm supabase:query matches
pnpm supabase:query matches "select=*&limit=5"
pnpm supabase:query matches "select=id" --count
pnpm supabase:query models "select=table_name,friendly_name"
```

## How to query (in a script)

Import the shared PostgREST client from `scripts/lib/supabase.mjs` and run with
`node --env-file=.env.local`:

```js
import { select, selectOne, count, insert, update } from "./lib/supabase.mjs"

const leagues = await select("leagues", "select=id,name,slug")
const n = await count("matches")
```

Client exports: `getSupabaseConfig`, `supabaseFetch`, `select`, `selectOne`,
`count`, `insert` (`ignoreDuplicates`/`returning`), `update`.

## Inspect the ForgeCMS schema

```bash
pnpm supabase:inspect-forgecms
```

Lists every registered model plus the exact field shape (slug, type, required,
system/computed) for `matches`, `standings`, `teams`, `leagues`, `seasons`,
`divisions`, and the current row counts.

## Reference

- App's checkout path uses the same PostgREST pattern in `src/lib/checkout/supabase.ts`.
- ForgeCMS registry schema: `SCHEMA.md` in the `cms-starter` repo
  (`public.models`, `public.fields`, `public.blocks`).
