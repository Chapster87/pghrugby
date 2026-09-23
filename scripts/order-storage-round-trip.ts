/**
 * Round-trip smoke check for the reshaped cart/order storage (ticket #80).
 *
 * Builds a mixed cart + Checkout Session fixture — a golf registration with its
 * add-on, plus a dues line and a preset donation — derives the durable rows
 * through the **same pure builders `recordOrder` uses**, writes them to Supabase
 * (`carts` snapshot, `orders` header, `order_lines`, `order_registrations`) and
 * reads all four back, then re-writes them to prove the write stays idempotent
 * (first writer wins, no duplicate rows).
 *
 * It talks to PostgREST directly because the app's write path is `server-only`
 * (which throws outside a server component). The builders it imports are the
 * real ones; only the transport is re-implemented here.
 *
 * Run against the shared project (needs the reshape migration applied):
 *
 *   node --env-file=.env.local --import tsx scripts/order-storage-round-trip.ts
 *
 * `--plan` derives and asserts the rows without touching the database (no
 * credentials needed) — useful for checking the wiring before the migration.
 */

import type Stripe from "stripe"

import type { CartEntry } from "../src/lib/checkout/cart-entries"
import {
  buildOrderRows,
  orderInsertPlan,
  orderLineId,
  splitForInsert,
} from "../src/lib/checkout/order-rows"

const SESSION_ID = "cs_roundtrip_order_storage"
const CART_REF = "cart-roundtrip-order-storage"
const PI_ID = "pi_roundtrip_order_storage"
const PLAN_ONLY = process.argv.includes("--plan")

/** The flagship mixed cart: registration + collector answers + add-on, dues, donation. */
const ENTRIES: CartEntry[] = [
  {
    id: "line-golf",
    kind: "product",
    sku: "golf-outing-registration",
    quantity: 3,
    sourcePdp: "golf-outing",
    groupRef: "group-golf",
  },
  {
    id: "collector-golf",
    kind: "collector",
    collectorRef: "golf-outing-collector",
    answers: {
      captainName: "Jane Smith",
      golfers: ["Mike Torres", "Priya Nair"],
      teamName: "Forge Old Boys",
    },
    fields: [
      {
        name: "captainName",
        label: "Captain name",
        type: "text",
        required: true,
      },
      {
        name: "golfers",
        label: "Golfer name",
        type: "text",
        required: true,
        repeatable: true,
        max: 3,
      },
    ],
    sourcePdp: "golf-outing",
    groupRef: "group-golf",
    parentId: "line-golf",
  },
  {
    id: "line-mulligan",
    kind: "product",
    sku: "golf-outing-mulligan",
    quantity: 3,
    sourcePdp: "golf-outing",
    groupRef: "group-golf",
    parentId: "line-golf",
  },
  {
    id: "line-dues",
    kind: "product",
    sku: "dues-fall",
    quantity: 1,
    sourcePdp: "dues",
    groupRef: "group-dues",
  },
  {
    id: "line-donation",
    kind: "product",
    sku: "donation-club-preset-50",
    quantity: 1,
    sourcePdp: "donate",
    groupRef: "group-dues",
  },
]

/** A Checkout Session as `recordOrder` retrieves it (products expanded). */
const SESSION = {
  id: SESSION_ID,
  client_reference_id: CART_REF,
  currency: "usd",
  amount_total: 72000,
  total_details: { amount_tax: 0 },
  payment_intent: PI_ID,
  payment_status: "paid",
  status: "complete",
  customer_details: { email: "jane@example.com", name: "Jane Smith" },
  collected_information: null,
  metadata: {
    families: "golf,dues,donation",
    reg_0: "Golf Outing Registration x3: Jane Smith, Mike Torres, Priya Nair",
    reg_count: "1",
    reg_ref: CART_REF,
  },
  line_items: {
    data: [
      {
        description: "Golf Outing Registration",
        quantity: 3,
        amount_total: 33000,
        price: {
          unit_amount: 11000,
          product: {
            id: "prod_golf_registration",
            metadata: { family: "golf" },
          },
        },
      },
      {
        description: "Golf Outing — Mulligan (4 + contest entry)",
        quantity: 3,
        amount_total: 9000,
        price: {
          unit_amount: 3000,
          product: { id: "prod_golf_mulligan", metadata: { family: "golf" } },
        },
      },
      {
        description: "Fall 2026 Season Dues",
        quantity: 1,
        amount_total: 25000,
        price: {
          unit_amount: 25000,
          product: { id: "prod_dues_fall", metadata: { family: "dues" } },
        },
      },
      {
        description: "Club donation — $50",
        quantity: 1,
        amount_total: 5000,
        price: {
          unit_amount: 5000,
          product: {
            id: "prod_donation_club_preset_50",
            metadata: { family: "donation" },
          },
        },
      },
    ],
  },
} as unknown as Stripe.Checkout.Session

// --- assertions ------------------------------------------------------------

let failures = 0

function check(label: string, condition: boolean): void {
  if (condition) {
    console.log(`  ok   ${label}`)
  } else {
    failures += 1
    console.error(`  FAIL ${label}`)
  }
}

/**
 * Structural equality for jsonb round-trips. Postgres `jsonb` normalises object
 * key order, so a plain `JSON.stringify` comparison would report a false
 * mismatch.
 */
function same(a: unknown, b: unknown): boolean {
  return stable(a) === stable(b)
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(
      ([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)
    )
    return `{${entries
      .map(([key, val]) => `${JSON.stringify(key)}:${stable(val)}`)
      .join(",")}}`
  }
  return JSON.stringify(value) ?? "null"
}

// --- PostgREST transport ---------------------------------------------------

function supabaseConfig(): { url: string; key: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. " +
        "Run with: node --env-file=.env.local --import tsx scripts/order-storage-round-trip.ts"
    )
  }
  return { url, key }
}

function headers(prefer?: string): Record<string, string> {
  const { key } = supabaseConfig()
  return {
    "Content-Type": "application/json",
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...(prefer ? { Prefer: prefer } : {}),
  }
}

/** Inserts row(s) first-writer-wins — the same semantics as insertIgnoreDuplicates. */
async function insertIgnoreDuplicates(
  table: string,
  rows: Record<string, unknown> | Record<string, unknown>[]
): Promise<void> {
  const { url } = supabaseConfig()
  const res = await fetch(`${url}/rest/v1/${table}`, {
    method: "POST",
    headers: headers("resolution=ignore-duplicates"),
    body: JSON.stringify(rows),
  })
  if (!res.ok) {
    throw new Error(
      `insert into ${table} failed (${res.status}): ${await res.text()}`
    )
  }
}

async function selectBySession<T>(table: string, order?: string): Promise<T[]> {
  const { url } = supabaseConfig()
  const params = new URLSearchParams({
    session_id: `eq.${SESSION_ID}`,
    select: "*",
  })
  if (order) params.set("order", order)
  const res = await fetch(`${url}/rest/v1/${table}?${params}`, {
    headers: headers(),
  })
  if (!res.ok) {
    throw new Error(
      `select from ${table} failed (${res.status}): ${await res.text()}`
    )
  }
  return (await res.json()) as T[]
}

async function deleteByColumn(
  table: string,
  column: string,
  value: string
): Promise<void> {
  const { url } = supabaseConfig()
  const res = await fetch(
    `${url}/rest/v1/${table}?${column}=eq.${encodeURIComponent(value)}`,
    { method: "DELETE", headers: headers() }
  )
  if (!res.ok) {
    throw new Error(
      `delete from ${table} failed (${res.status}): ${await res.text()}`
    )
  }
}

// --- the round-trip --------------------------------------------------------

/** Walks the shared insert plan — header, primaries, add-ons, registrations. */
async function writeRows(rows: ReturnType<typeof buildOrderRows>) {
  for (const batch of orderInsertPlan(rows)) {
    await insertIgnoreDuplicates(batch.table, batch.rows)
  }
}

async function main(): Promise<void> {
  const rows = buildOrderRows(SESSION, ENTRIES)
  const { primaries, addons } = splitForInsert(rows.lines)

  console.log("Derived rows from the mixed cart + session fixture:")
  check(
    "header families = golf, dues, donation",
    same(rows.header.families, ["golf", "dues", "donation"])
  )
  check("4 priced lines", rows.lines.length === 4)
  check(
    "line 0 is the golf primary with no parent",
    rows.lines[0].parent_line_id === null &&
      rows.lines[0].source_pdp === "golf-outing"
  )
  check(
    "line 1 (mulligan) points at the golf primary",
    rows.lines[1].parent_line_id === orderLineId(SESSION_ID, 0)
  )
  check(
    "families land per line",
    same(
      rows.lines.map((l) => l.family),
      ["golf", "golf", "dues", "donation"]
    )
  )
  check("3 primaries, 1 add-on", primaries.length === 3 && addons.length === 1)
  check(
    "one registration on line 0",
    rows.registrations.length === 1 &&
      rows.registrations[0].line_id === orderLineId(SESSION_ID, 0)
  )
  check(
    "registration summary is the reg_0 metadata",
    rows.registrations[0].summary === SESSION.metadata!.reg_0
  )
  check(
    "registration answers + fields persist",
    same(
      rows.registrations[0].answers,
      ENTRIES[1].kind === "collector" ? ENTRIES[1].answers : null
    ) && Array.isArray(rows.registrations[0].fields)
  )

  if (failures > 0) {
    throw new Error(`${failures} derivation assertion(s) failed`)
  }

  if (PLAN_ONLY) {
    console.log("\n--plan: skipping the database round-trip.")
    return
  }

  try {
    console.log("\nWriting the cart snapshot + order rows …")
    await insertIgnoreDuplicates("carts", [
      {
        cart_ref: CART_REF,
        currency: "usd",
        entries: ENTRIES,
        total: 72000,
      },
    ])
    await writeRows(rows)

    console.log("Reading back …")
    const [header] = await selectBySession<{
      families: string[]
      amount_total: number
    }>("orders")
    const lines = await selectBySession<{
      id: string
      line_index: number
      parent_line_id: string | null
      family: string | null
    }>("order_lines", "line_index.asc")
    const registrations = await selectBySession<{
      id: string
      line_id: string
      summary: string | null
      answers: unknown
    }>("order_registrations")

    check(
      "header reads back",
      !!header && same(header.families, ["golf", "dues", "donation"])
    )
    check("4 order_lines read back", lines.length === 4)
    check(
      "add-on parent link survives the round-trip",
      lines[1]?.parent_line_id === orderLineId(SESSION_ID, 0)
    )
    check(
      "one order_registration reads back",
      registrations.length === 1 &&
        registrations[0].line_id === orderLineId(SESSION_ID, 0)
    )
    check(
      "registration summary survives",
      registrations[0]?.summary === SESSION.metadata!.reg_0
    )

    // carts is selected by session_id, which it does not have — read it by ref.
    const { url } = supabaseConfig()
    const cartRes = await fetch(
      `${url}/rest/v1/carts?cart_ref=eq.${encodeURIComponent(
        CART_REF
      )}&select=*&limit=1`,
      { headers: headers() }
    )
    const cartRows = (await cartRes.json()) as {
      entries: CartEntry[]
      total: number
    }[]
    check(
      "cart snapshot entries read back",
      same(cartRows[0]?.entries, ENTRIES) && cartRows[0]?.total === 72000
    )

    console.log("\nRe-writing to prove idempotency …")
    await writeRows(rows)
    const linesAgain = await selectBySession<{ id: string }>("order_lines")
    const regsAgain = await selectBySession<{ id: string }>(
      "order_registrations"
    )
    check("no duplicate order_lines", linesAgain.length === 4)
    check("no duplicate order_registrations", regsAgain.length === 1)

    if (failures > 0) {
      throw new Error(`${failures} round-trip assertion(s) failed`)
    }

    console.log("\nRound-trip OK.")
  } finally {
    if (process.env.ROUND_TRIP_KEEP !== "1") {
      await deleteByColumn(
        "order_registrations",
        "session_id",
        SESSION_ID
      ).catch(() => {})
      await deleteByColumn("order_lines", "session_id", SESSION_ID).catch(
        () => {}
      )
      await deleteByColumn("orders", "session_id", SESSION_ID).catch(() => {})
      await deleteByColumn("carts", "cart_ref", CART_REF).catch(() => {})
      console.log(
        "Cleaned up the fixture rows (set ROUND_TRIP_KEEP=1 to keep them)."
      )
    }
  }
}

main().catch((err) => {
  console.error(`\n${err instanceof Error ? err.message : err}`)
  process.exitCode = 1
})
