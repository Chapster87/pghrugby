/**
 * Integration port of `scripts/order-storage-round-trip.ts` (ticket #80),
 * moved into the integration layer for #129.
 *
 * Builds a mixed cart + Checkout Session fixture — a golf registration with its
 * add-on, plus a dues line and a preset donation — derives the durable rows
 * through the real builders in `order-rows.ts`, writes them with the app's real
 * transport (`supabase.ts`, driving the same insert plan `recordOrder` walks),
 * reads all four tables back, and re-writes them to prove the write stays
 * idempotent (first writer wins, no duplicate rows).
 *
 * `supabase.ts` is `server-only`; that marker is neutralised for the whole
 * integration layer by an alias in `vitest.integration.config.mts`. Nothing else
 * is mocked — the builders and the transport are the real ones.
 */

import type Stripe from "stripe"
import { beforeAll, describe, expect, it } from "vitest"

import type { CartEntry } from "@/lib/checkout/cart-entries"
import {
  buildOrderRows,
  orderInsertPlan,
  orderLineId,
  splitForInsert,
  type OrderLine,
  type OrderRecord,
  type OrderRegistration,
} from "@/lib/checkout/order-rows"
import {
  insertIgnoreDuplicates,
  selectRow,
  selectRows,
} from "@/lib/checkout/supabase"

const SESSION_ID = "cs_roundtrip_order_storage"
const CART_REF = "cart-roundtrip-order-storage"
const PI_ID = "pi_roundtrip_order_storage"

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

const rows = buildOrderRows(SESSION, ENTRIES)
const { primaries, addons } = splitForInsert(rows.lines)

/** Walks the shared insert plan — header, primaries, add-ons, registrations. */
async function writeRows(record: ReturnType<typeof buildOrderRows>) {
  for (const batch of orderInsertPlan(record)) {
    await insertIgnoreDuplicates(batch.table, batch.rows)
  }
}

describe("Derived rows from the mixed cart + session fixture", () => {
  it("header families = golf, dues, donation", () => {
    expect(same(rows.header.families, ["golf", "dues", "donation"])).toBe(true)
  })

  it("4 priced lines", () => {
    expect(rows.lines.length).toBe(4)
  })

  it("line 0 is the golf primary with no parent", () => {
    expect(
      rows.lines[0].parent_line_id === null &&
        rows.lines[0].source_pdp === "golf-outing"
    ).toBe(true)
  })

  it("line 1 (mulligan) points at the golf primary", () => {
    expect(rows.lines[1].parent_line_id).toBe(orderLineId(SESSION_ID, 0))
  })

  it("families land per line", () => {
    expect(
      same(
        rows.lines.map((l) => l.family),
        ["golf", "golf", "dues", "donation"]
      )
    ).toBe(true)
  })

  it("3 primaries, 1 add-on", () => {
    expect(primaries.length === 3 && addons.length === 1).toBe(true)
  })

  it("one registration on line 0", () => {
    expect(
      rows.registrations.length === 1 &&
        rows.registrations[0].line_id === orderLineId(SESSION_ID, 0)
    ).toBe(true)
  })

  it("registration summary is the reg_0 metadata", () => {
    expect(rows.registrations[0].summary).toBe(SESSION.metadata!.reg_0)
  })

  it("registration answers + fields persist", () => {
    expect(
      same(
        rows.registrations[0].answers,
        ENTRIES[1].kind === "collector" ? ENTRIES[1].answers : null
      ) && Array.isArray(rows.registrations[0].fields)
    ).toBe(true)
  })
})

describe("Reading back", () => {
  beforeAll(async () => {
    await insertIgnoreDuplicates("carts", [
      {
        cart_ref: CART_REF,
        currency: "usd",
        entries: ENTRIES,
        total: 72000,
      },
    ])
    await writeRows(rows)
  })

  it("header reads back", async () => {
    const [header] = await selectRows<OrderRecord>(
      "orders",
      "session_id",
      SESSION_ID
    )
    expect(
      !!header && same(header.families, ["golf", "dues", "donation"])
    ).toBe(true)
  })

  it("4 order_lines read back", async () => {
    const lines = await selectRows<OrderLine>(
      "order_lines",
      "session_id",
      SESSION_ID,
      "line_index.asc"
    )
    expect(lines.length).toBe(4)
  })

  it("add-on parent link survives the round-trip", async () => {
    const lines = await selectRows<OrderLine>(
      "order_lines",
      "session_id",
      SESSION_ID,
      "line_index.asc"
    )
    expect(lines[1]?.parent_line_id).toBe(orderLineId(SESSION_ID, 0))
  })

  it("one order_registration reads back", async () => {
    const registrations = await selectRows<OrderRegistration>(
      "order_registrations",
      "session_id",
      SESSION_ID
    )
    expect(
      registrations.length === 1 &&
        registrations[0].line_id === orderLineId(SESSION_ID, 0)
    ).toBe(true)
  })

  it("registration summary survives", async () => {
    const registrations = await selectRows<OrderRegistration>(
      "order_registrations",
      "session_id",
      SESSION_ID
    )
    expect(registrations[0]?.summary).toBe(SESSION.metadata!.reg_0)
  })

  it("cart snapshot entries read back", async () => {
    // carts is selected by session_id, which it does not have — read it by ref.
    const cart = await selectRow<{ entries: CartEntry[]; total: number }>(
      "carts",
      "cart_ref",
      CART_REF
    )
    expect(same(cart?.entries, ENTRIES) && cart?.total === 72000).toBe(true)
  })
})

describe("Re-writing to prove idempotency", () => {
  beforeAll(async () => {
    await writeRows(rows)
  })

  it("no duplicate order_lines", async () => {
    const linesAgain = await selectRows<{ id: string }>(
      "order_lines",
      "session_id",
      SESSION_ID
    )
    expect(linesAgain.length).toBe(4)
  })

  it("no duplicate order_registrations", async () => {
    const regsAgain = await selectRows<{ id: string }>(
      "order_registrations",
      "session_id",
      SESSION_ID
    )
    expect(regsAgain.length).toBe(1)
  })
})
