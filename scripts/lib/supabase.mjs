/**
 * Shared Supabase PostgREST client for the pghrugby/ForgeCMS database.
 *
 * ForgeCMS shares the SAME Supabase project as the website (ref
 * `knqlsiuhdcflazlnefob`), so this one client reads/writes the website's
 * `orders`/`carts` tables AND ForgeCMS's content tables (`matches`,
 * `standings`, `teams`, `leagues`, `seasons`, `divisions`, plus the `models` /
 * `fields` registry that defines them). See `docs/agents/supabase-postgrest.md`.
 *
 * Run any script that imports this from the repo root with:
 *
 *   node --env-file=.env.local scripts/<your-script>.mjs
 *
 * Credentials come from `.env.local` via Node's `--env-file` flag (never read
 * the file directly). The service role key is required — the website's
 * `orders`/`carts` tables are RLS-enabled with zero policies, and ForgeCMS
 * reads use the service role too.
 */

import { env } from "node:process"

/** Returns the validated Supabase connection config, throwing a helpful error
 *  if `.env.local` wasn't loaded. */
export function getSupabaseConfig() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. " +
        "Run with: node --env-file=.env.local scripts/<script>.mjs"
    )
  }
  return { url, key }
}

/** Builds the PostgREST headers for the service role (bypasses RLS). */
function authHeaders() {
  const { key } = getSupabaseConfig()
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  }
}

/**
 * Executes a raw PostgREST request against a table.
 *
 * @param {string} table - Table name (e.g. `matches`, `standings`, `models`).
 * @param {object} opts - `method`, `params` (URL query string), `body`
 *   (object for POST/PATCH), `prefer` (PostgREST preference header), `range`
 *   (e.g. `"0-0"`). Returns `{ rows, count }` where `count` is the parsed
 *   total from the `Content-Range` header (or null when absent).
 */
export async function supabaseFetch(
  table,
  { method = "GET", params = "", body, prefer, range } = {}
) {
  const { url } = getSupabaseConfig()
  const res = await fetch(`${url}/rest/v1/${table}${params ? `?${params}` : ""}`, {
    method,
    headers: {
      ...authHeaders(),
      ...(prefer ? { Prefer: prefer } : {}),
      ...(range ? { Range: range } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`${method} ${table} failed (${res.status}): ${detail}`)
  }
  const raw = res.status === 204 ? null : await res.json().catch(() => null)
  const contentRange = res.headers.get("content-range")
  const count = contentRange ? Number(contentRange.split("/")[1]) : null
  return { rows: raw, count }
}

/**
 * Selects rows from a table. `params` is a raw PostgREST query string
 * (`select=*&league=eq.<id>&order=name.asc`); omit to select everything.
 *
 * @param {string} table - Table name.
 * @param {string} [params] - PostgREST query string.
 * @returns {Promise<Array<object>>}
 */
export async function select(table, params = "select=*") {
  const { rows } = await supabaseFetch(table, { params })
  return rows
}

/** Selects the first matching row, or null when none match.
 *  @param {string} table - Table name.
 *  @param {string} params - PostgREST query string (add `&limit=1`). */
export async function selectOne(table, params) {
  const rows = await select(table, `${params}&limit=1`)
  return rows[0] ?? null
}

/**
 * Counts rows in a table.
 * @param {string} table - Table name.
 * @returns {Promise<number>}
 */
export async function count(table) {
  const { count } = await supabaseFetch(table, {
    params: "select=id",
    prefer: "count=exact",
    range: "0-0",
  })
  return count ?? 0
}

/**
 * Inserts one or more rows.
 * @param {string} table - Table name.
 * @param {object|object[]} body - Row(s) to insert.
 * @param {object} [opts] - `ignoreDuplicates` uses `resolution=ignore-duplicates`
 *   (first writer wins), `returning` sets `return=representation`.
 * @returns {Promise<Array<object>|null>} Inserted rows when `returning`, else null.
 */
export async function insert(table, body, { ignoreDuplicates = false, returning = false } = {}) {
  const prefs = []
  if (ignoreDuplicates) prefs.push("resolution=ignore-duplicates")
  if (returning) prefs.push("return=representation")
  const { rows } = await supabaseFetch(table, {
    method: "POST",
    body,
    prefer: prefs.length ? prefs.join(",") : undefined,
  })
  return rows
}

/**
 * Updates rows matching a filter (PostgREST PATCH).
 * @param {string} table - Table name.
 * @param {string} filter - e.g. `session_id=eq.<value>`.
 * @param {object} body - Column values to set.
 * @param {boolean} [returning] - Return updated rows.
 * @returns {Promise<Array<object>|null>}
 */
export async function update(table, filter, body, { returning = false } = {}) {
  const { rows } = await supabaseFetch(table, {
    method: "PATCH",
    params: `${filter}&select=*`,
    body,
    prefer: returning ? "return=representation" : undefined,
  })
  return rows
}
