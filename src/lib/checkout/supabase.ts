import "server-only"

/**
 * Minimal Supabase PostgREST client for the website project
 * (ref: knqlsiuhdcflazlnefob). The `orders` / `order_lines` /
 * `order_registrations` / `carts` tables are RLS-enabled with zero policies, so
 * only the service role key can read/write them — it is never exposed to the
 * browser.
 */

/** The order/cart tables this client is allowed to touch. */
type Table = "orders" | "order_lines" | "order_registrations" | "carts"

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
 * POSTs row(s) with `on conflict do nothing` semantics via PostgREST's
 * `resolution=ignore-duplicates` preference — the first writer wins, which is
 * the locked write path for `orders` and its child rows (webhook authoritative
 * + return-page fast path race to the same deterministic ids). A conflicting
 * row in a bulk insert is skipped individually.
 */
export async function insertIgnoreDuplicates<T extends Record<string, unknown>>(
  table: Table,
  row: T | T[]
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

/**
 * PATCHes a row via PostgREST — the only write tool the event handlers use,
 * and it touches mutable status columns only (`payment_status`,
 * `session_status`, `refunded_amount`, `refund_status`, `updated_at`); the
 * frozen first-write columns are never updated here (never
 * `resolution=merge-duplicates`, which would clobber them). Returns the
 * updated row, or null when no row matched the filter.
 */
export async function updateRow<T extends Record<string, unknown>>(
  table: Table,
  column: string,
  value: string,
  updates: Partial<T>
): Promise<T | null> {
  const { supabaseUrl, serviceRoleKey } = supabaseConfig()

  const res = await fetch(
    `${supabaseUrl}/rest/v1/${table}?${column}=eq.${encodeURIComponent(
      value
    )}&select=*`,
    {
      method: "PATCH",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(updates),
      cache: "no-store",
    }
  )

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(
      `PostgREST update ${table} failed (${res.status}): ${detail}`
    )
  }

  const rows = (await res.json()) as T[]
  return rows[0] ?? null
}

/** Selects every row matching a column equality filter, optionally ordered. */
export async function selectRows<T extends Record<string, unknown>>(
  table: Table,
  column: string,
  value: string,
  order?: string
): Promise<T[]> {
  const { supabaseUrl, serviceRoleKey } = supabaseConfig()

  const params = new URLSearchParams({ [column]: `eq.${value}`, select: "*" })
  if (order) params.set("order", order)

  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?${params}`, {
    method: "GET",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    cache: "no-store",
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new Error(
      `PostgREST select from ${table} failed (${res.status}): ${detail}`
    )
  }

  return (await res.json()) as T[]
}

/** Selects a single row (or null) by a unique column equality filter. */
export async function selectRow<T extends Record<string, unknown>>(
  table: Table,
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
