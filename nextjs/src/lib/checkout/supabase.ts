import "server-only"

/**
 * Minimal Supabase PostgREST client for the website project
 * (ref: knqlsiuhdcflazlnefob). The `orders` and `carts` tables are RLS-enabled
 * with zero policies, so only the service role key can read/write them — it is
 * never exposed to the browser.
 */

/** Reads + validates the Supabase env; throws with a clear message if missing. */
function supabaseConfig(): { supabaseUrl: string; serviceRoleKey: string } {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to write orders/carts"
    )
  }
  return { supabaseUrl, serviceRoleKey }
}

/**
 * POSTs a row with `on conflict do nothing` semantics via PostgREST's
 * `resolution=ignore-duplicates` preference — the first writer wins, which is
 * the locked write path for `orders` (webhook authoritative + return-page fast
 * path race to the same row).
 */
export async function insertIgnoreDuplicates<T extends Record<string, unknown>>(
  table: "orders" | "carts",
  row: T
): Promise<void> {
  const { supabaseUrl, serviceRoleKey } = supabaseConfig()

  const res = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates",
    },
    body: JSON.stringify(row),
    cache: "no-store",
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(
      `PostgREST insert into ${table} failed (${res.status}): ${detail}`
    )
  }
}

/** Selects a single row (or null) by a unique column equality filter. */
export async function selectRow<T extends Record<string, unknown>>(
  table: "orders" | "carts",
  column: string,
  value: string
): Promise<T | null> {
  const { supabaseUrl, serviceRoleKey } = supabaseConfig()

  const res = await fetch(
    `${supabaseUrl}/rest/v1/${table}?${column}=eq.${encodeURIComponent(
      value
    )}&select=*&limit=1`,
    {
      method: "GET",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      cache: "no-store",
    }
  )

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(
      `PostgREST select from ${table} failed (${res.status}): ${detail}`
    )
  }

  const rows = (await res.json()) as T[]
  return rows[0] ?? null
}
