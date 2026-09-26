/**
 * Round-trip smoke check for registration-bearing lines (ticket #83), with the
 * golf outing as the worked example.
 *
 * Walks the whole offline chain a registration takes — the `quantity → rows`
 * rule, the add-to-cart group, the Stripe metadata, and the durable order rows —
 * through the same pure modules the PDP, the session build, and `recordOrder`
 * use. No Stripe, DatoCMS or Supabase credentials: the sku → `product` records
 * and the retrieved Checkout Session are fixtures, exactly as the builders
 * receive them.
 *
 * It covers the ticket's five acceptance criteria: a registration plus mulligan
 * and drink band as one priced group in one session, `quantity → rows` adding
 * and dropping player rows, add-ons keyed on `(sku, parentId)` with a second
 * registration as a new line plus collector entry, cascade removal, and
 * `order_registrations` rows carrying `fields` and `answers` against the line
 * the success page groups them under.
 *
 *   node --import tsx scripts/registration-round-trip.ts
 *   pnpm registration:round-trip
 */

import type Stripe from "stripe"

import {
  isCollectorEntry,
  parseCartEntries,
  pricedLines,
  type CartEntry,
  type CollectorEntry,
  type CollectorField,
  type PricedLine,
} from "../src/lib/checkout/cart-entries"
import {
  addGroup,
  removeEntry,
  type CartAddGroup,
  type IdFactory,
} from "../src/lib/checkout/cart-mutations"
import {
  applyQuantityChange,
  planQuantityChange,
  registrationRowCount,
  rowsOf,
  type CollectorAnswers,
} from "../src/components/collector-form/rows"
import {
  quoteCart,
  type ProductPriceRecord,
} from "../src/lib/checkout/cart-pricing"
import { buildOrderMetadata } from "../src/lib/checkout/order-metadata"
import {
  buildOrderRows,
  orderInsertPlan,
  orderLineId,
} from "../src/lib/checkout/order-rows"

// --- fixtures ----------------------------------------------------------------

const CART_REF = "cart-roundtrip-registration"
const SESSION_ID = "cs_roundtrip_registration"

/** The instant the quote is resolved at (no sale windows are in play). */
const AT = new Date("2026-09-15T12:00:00Z")

/**
 * The golf outing's DataCollector as DatoCMS holds it: the captain is player 1
 * (non-repeatable), the repeatable field collects the remaining 1–3.
 */
const FIELDS: CollectorField[] = [
  { name: "captainName", label: "Captain name", type: "text", required: true },
  { name: "teamName", label: "Team name", type: "text" },
  {
    name: "golfers",
    label: "Golfer name",
    type: "text",
    required: true,
    repeatable: true,
    max: 3,
  },
]

/** The answers a foursome commit: the captain, then the other three. */
const ANSWERS = {
  captainName: "Jane Smith",
  teamName: "Forge Old Boys",
  golfers: ["Mike Torres", "Priya Nair", "Dana Cole"],
}

/**
 * One add-to-cart action as the golf PDP commits it: the quantity-bearing
 * registration, its two add-on lines, and one collector entry snapshotting the
 * field definitions.
 */
function golfAdd(): CartAddGroup {
  return {
    primaries: [
      { sku: "golf-outing-registration", quantity: 4, quantityBearing: true },
    ],
    addons: [
      { sku: "golf-outing-mulligan", quantity: 4, quantityBearing: true },
      { sku: "golf-outing-drink-band", quantity: 2, quantityBearing: true },
    ],
    collector: {
      collectorRef: "golf-outing-collector",
      answers: ANSWERS,
      fields: FIELDS,
    },
  }
}

/** A deterministic id minter, so assertions can name the entries they expect. */
function idFactory(): IdFactory {
  let n = 0
  return (kind) => `${kind}-${++n}`
}

/** The golf skus' DatoCMS `product` records — all in stock, no sale running. */
const RECORDS = new Map<string, ProductPriceRecord>(
  [
    "golf-outing-registration",
    "golf-outing-mulligan",
    "golf-outing-drink-band",
  ].map((sku) => [
    sku,
    {
      sku,
      inStock: true,
      priceId: `price_live_${sku}`,
      salePriceId: null,
      saleStartsAt: null,
      saleEndsAt: null,
    },
  ])
)

// --- assertions --------------------------------------------------------------

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
 * Structural equality. A `jsonb` column and the browser's `localStorage` both
 * normalise what they hand back, so a plain string comparison would report a
 * false mismatch; keys are sorted and `undefined` values dropped.
 */
function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(stable(a)) === JSON.stringify(stable(b))
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, stable(entry)])
    )
  }
  return value
}

function main(): void {
  // --- quantity → rows -------------------------------------------------------

  console.log("`quantity → rows` mirrors the repeatable field")
  check(
    "quantity 1 still renders one row",
    registrationRowCount(1, 3) === 1 && registrationRowCount(0, 3) === 1
  )
  check(
    "the remaining players are quantity − 1",
    registrationRowCount(2, 3) === 1 &&
      registrationRowCount(3, 3) === 2 &&
      registrationRowCount(4, 3) === 3
  )
  check("the field's max caps the rows", registrationRowCount(9, 3) === 3)
  check(
    "a field with no max is the remaining players",
    registrationRowCount(4) === 3
  )
  check(
    "a field holding no rows reads as one empty row",
    same(rowsOf({}, "golfers"), [""])
  )

  console.log("\nA quantity change adds and drops player rows")
  const typed: CollectorAnswers = {
    captainName: "Jane Smith",
    teamName: "Forge Old Boys",
    golfers: ["Mike Torres"],
  }
  const grown = applyQuantityChange(FIELDS, typed, 4)
  check(
    "raising the quantity grows the rows",
    grown.rowCount === 3 && grown.values.golfers.length === 3
  )
  check(
    "the rows already typed are kept",
    grown.values.golfers[0] === "Mike Torres"
  )
  check(
    "the rows it added are empty",
    rowsOf(grown.values, "golfers")
      .slice(1)
      .every((row) => row === "")
  )
  check("raising the quantity drops nothing", grown.dropped.length === 0)
  check(
    "a non-repeatable field is untouched",
    grown.values.captainName === "Jane Smith" &&
      grown.values.teamName === "Forge Old Boys"
  )

  const named: CollectorAnswers = { ...typed, golfers: [...ANSWERS.golfers] }
  const shrunk = applyQuantityChange(FIELDS, named, 2)
  check(
    "lowering the quantity shrinks the rows",
    shrunk.rowCount === 1 && shrunk.values.golfers.length === 1
  )
  check(
    "the surviving row keeps its value",
    shrunk.values.golfers[0] === "Mike Torres"
  )
  check(
    "the named rows it dropped are reported, so a caller can warn",
    same(shrunk.dropped, ["Priya Nair", "Dana Cole"])
  )
  check(
    "dropping a blank row is not reported",
    applyQuantityChange(
      FIELDS,
      { ...typed, golfers: ["Mike Torres", "", ""] },
      2
    ).dropped.length === 0
  )
  check(
    "the floor holds at one row",
    applyQuantityChange(FIELDS, named, 1).values.golfers.length === 1
  )

  const before = JSON.stringify(named)
  const planned = planQuantityChange(FIELDS, named, 2)
  check(
    "planning a change commits nothing",
    JSON.stringify(named) === before &&
      planned.rowCount === 1 &&
      same(planned.dropped, ["Priya Nair", "Dana Cole"])
  )

  // --- the add-to-cart group -------------------------------------------------

  console.log("\nOne add-to-cart commits a fully specified group")
  const ids = idFactory()
  const cart = addGroup([], golfAdd(), {
    sourcePdp: "golf-outing",
    idFactory: ids,
  })
  const lines = pricedLines(cart)
  const collectors = cart.filter(isCollectorEntry)
  const primary = lines[0]
  const [mulligan, drinkBand] = lines.slice(1)

  check(
    "the group is three priced lines and one collector entry",
    cart.length === 4
  )
  check(
    "the registration is the primary",
    primary?.sku === "golf-outing-registration" &&
      primary.quantity === 4 &&
      primary.quantityBearing === true &&
      primary.parentId === undefined
  )
  check(
    "both add-ons are priced lines linked by parentId",
    mulligan?.sku === "golf-outing-mulligan" &&
      mulligan.quantity === 4 &&
      mulligan.parentId === primary.id &&
      drinkBand?.sku === "golf-outing-drink-band" &&
      drinkBand.quantity === 2 &&
      drinkBand.parentId === primary.id
  )
  check(
    "the add-ons keep their own source and group",
    lines.every(
      (line) =>
        line.sourcePdp === "golf-outing" && line.groupRef === primary.groupRef
    )
  )
  check(
    "one collector entry rides the primary",
    collectors.length === 1 && collectors[0].parentId === primary.id
  )
  check(
    "the collector entry snapshots the field definitions",
    same(collectors[0].fields, FIELDS) &&
      collectors[0].collectorRef === "golf-outing-collector"
  )
  check(
    "the collector entry carries the answers",
    same(collectors[0].answers, ANSWERS)
  )

  // --- merging ---------------------------------------------------------------

  console.log("\nA second registration is a new line plus collector entry")
  const twice = addGroup(cart, golfAdd(), {
    sourcePdp: "golf-outing",
    idFactory: ids,
  })
  const primaries = pricedLines(twice).filter((line) => !line.parentId)
  const registrations = twice.filter(isCollectorEntry)
  check("two registration primaries, neither merged", primaries.length === 2)
  check(
    "the second registration did not absorb the first",
    primaries.every((line) => line.quantity === 4)
  )
  check("one collector entry per registration", registrations.length === 2)
  check(
    "each collector rides its own line",
    new Set(registrations.map((entry) => entry.parentId)).size === 2 &&
      registrations.every((entry) =>
        primaries.some((line) => line.id === entry.parentId)
      )
  )

  const mulligans = pricedLines(twice).filter(
    (line) => line.sku === "golf-outing-mulligan"
  )
  check("the same sku rides two lines at once", mulligans.length === 2)
  check(
    "add-ons key on (sku, parentId), so they stay apart",
    new Set(mulligans.map((line) => line.parentId)).size === 2
  )

  const repeated = addGroup(
    [],
    {
      ...golfAdd(),
      addons: [
        { sku: "golf-outing-mulligan", quantity: 1 },
        { sku: "golf-outing-mulligan", quantity: 2 },
      ],
    },
    { sourcePdp: "golf-outing", idFactory: idFactory() }
  )
  const mergedAddon = pricedLines(repeated).filter((line) => line.parentId)
  check(
    "a repeated add-on sku under one primary merges",
    mergedAddon.length === 1
  )
  check(
    "the merged quantities sum",
    mergedAddon[0]?.quantity === 3 &&
      mergedAddon[0]?.parentId ===
        pricedLines(repeated).find((line) => !line.parentId)?.id
  )

  // --- cascade removal -------------------------------------------------------

  console.log(
    "\nRemoving a primary cascades to its add-ons and collector entry"
  )
  const removed = removeEntry(twice, primaries[0].id)
  check(
    "the primary is gone",
    !removed.some((entry) => entry.id === primaries[0].id)
  )
  check(
    "its add-ons go with it",
    !removed.some((entry) => entry.parentId === primaries[0].id)
  )
  check(
    "its collector entry goes with it",
    removed.filter(isCollectorEntry).length === 1
  )
  check(
    "the other registration keeps its line, its add-ons and its entry",
    removed.length === 4 &&
      pricedLines(removed).filter((line) => !line.parentId).length === 1
  )

  const survivingAddon = pricedLines(removed).find((line) => line.parentId)
  const withoutAddon = removeEntry(removed, survivingAddon?.id ?? "")
  check(
    "removing one add-on leaves its primary and registration alone",
    withoutAddon.length === 3 &&
      pricedLines(withoutAddon).filter((line) => !line.parentId).length === 1 &&
      withoutAddon.filter(isCollectorEntry).length === 1
  )

  // --- one session -----------------------------------------------------------

  console.log("\nA registration plus both add-ons is one session")
  const quoted = quoteCart(cart, RECORDS, { now: AT })
  check(
    "the line items are the priced lines, in cart order",
    quoted.lines.map((line) => line.sku).join(",") ===
      "golf-outing-registration,golf-outing-mulligan,golf-outing-drink-band"
  )
  check(
    "the collector entry never becomes a line item",
    quoted.lines.length === 3
  )
  check(
    "quantities ride the line items",
    quoted.lines.map((line) => line.quantity).join(",") === "4,4,2"
  )
  check(
    "every line bills at the Price the CMS names",
    // The CMS's `price_id` is the override; the catalog's is the default under it.
    quoted.lines.every(
      (line) => line.priceId === RECORDS.get(line.sku)?.priceId
    )
  )
  check("nothing is refused", quoted.errors.length === 0)

  const metadata = buildOrderMetadata(cart, CART_REF)
  check("the session is a golf order", metadata.metadata.families === "golf")
  check("one registration", metadata.metadata.reg_count === "1")
  check("reg_ref is the cartRef", metadata.metadata.reg_ref === CART_REF)
  check(
    "reg_0 is the registration's roster",
    metadata.metadata.reg_0 ===
      "Golf Outing Registration x4: Jane Smith, Forge Old Boys, Mike Torres, Priya Nair, Dana Cole"
  )

  console.log("\nThe reg_N summary inherits to the add-ons")
  check(
    "the first add-on inherits the roster under its own name",
    metadata.metadata.reg_1 ===
      "Golf Outing — Mulligan (4 + contest entry) x4: Jane Smith, Forge Old Boys, Mike Torres, Priya Nair, Dana Cole"
  )
  check(
    "so does the second",
    metadata.metadata.reg_2 ===
      "Golf Outing — All You Can Drink x2: Jane Smith, Forge Old Boys, Mike Torres, Priya Nair, Dana Cole"
  )
  check(
    "the collector entry takes no reg_N slot of its own",
    metadata.metadata.reg_3 === undefined
  )

  // --- the browser round trip ------------------------------------------------

  console.log("\nThe registration survives the browser round trip")
  const reloaded = parseCartEntries(JSON.parse(JSON.stringify(cart)))
  check("every entry comes back", reloaded.length === cart.length)
  check("deep-equal after the round trip", same(reloaded, cart))
  const reloadedCollector = reloaded.filter(isCollectorEntry)[0]
  check("the field snapshot survives", same(reloadedCollector?.fields, FIELDS))
  check("the answers survive", same(reloadedCollector?.answers, ANSWERS))

  // --- the durable order rows ------------------------------------------------

  /** A Checkout Session as `recordOrder` retrieves it (products expanded). */
  const session = {
    id: SESSION_ID,
    client_reference_id: CART_REF,
    currency: "usd",
    amount_total: 62000,
    total_details: { amount_tax: 0 },
    payment_intent: "pi_roundtrip_registration",
    payment_status: "paid",
    status: "complete",
    customer_details: { email: "jane@example.com", name: "Jane Smith" },
    collected_information: null,
    metadata: metadata.metadata,
    line_items: {
      data: [
        {
          description: "Golf Outing Registration",
          quantity: 4,
          amount_total: 44000,
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
          quantity: 4,
          amount_total: 12000,
          price: {
            unit_amount: 3000,
            product: { id: "prod_golf_mulligan", metadata: { family: "golf" } },
          },
        },
        {
          description: "Golf Outing — All You Can Drink",
          quantity: 2,
          amount_total: 6000,
          price: {
            unit_amount: 3000,
            product: {
              id: "prod_golf_drink_band",
              metadata: { family: "golf" },
            },
          },
        },
      ],
    },
  } as unknown as Stripe.Checkout.Session

  console.log("\n`order_registrations` rows land with fields and answers")
  const rows = buildOrderRows(session, cart)
  const registration = rows.registrations[0]

  check(
    "the header carries the family and the cartRef",
    rows.header.families.join(",") === "golf" &&
      rows.header.client_reference_id === CART_REF
  )
  check("three order lines", rows.lines.length === 3)
  check(
    "line_index is 0-based in session order",
    rows.lines.map((line) => line.line_index).join(",") === "0,1,2"
  )
  check("the primary line has no parent", rows.lines[0].parent_line_id === null)
  check(
    "each add-on line hangs off the primary",
    rows.lines[1].parent_line_id === orderLineId(SESSION_ID, 0) &&
      rows.lines[2].parent_line_id === orderLineId(SESSION_ID, 0)
  )
  check(
    "one registration row, against the primary line",
    rows.registrations.length === 1
  )
  check(
    "the registration is tied to that line",
    registration?.line_id === orderLineId(SESSION_ID, 0) &&
      registration?.id === registration?.line_id
  )
  check(
    "the collector ref lands",
    registration?.collector_ref === "golf-outing-collector"
  )
  check(
    "fields land as the add-time snapshot",
    same(registration?.fields, FIELDS)
  )
  check("answers land raw", same(registration?.answers, ANSWERS))
  check(
    "the summary is the reg_N string the session carried",
    registration?.summary === metadata.metadata.reg_0
  )

  const stored = JSON.parse(JSON.stringify(rows)) as typeof rows
  check(
    "fields survive the jsonb round trip",
    same(stored.registrations[0].fields, FIELDS)
  )
  check(
    "answers survive the jsonb round trip",
    same(stored.registrations[0].answers, ANSWERS)
  )

  const batches = orderInsertPlan(rows)
  check("the header is written first", batches[0].table === "orders")
  check(
    "primaries are inserted before add-ons",
    batches[1].table === "order_lines" && batches[1].rows.length === 1
  )
  check(
    "the add-ons follow them",
    batches[2].table === "order_lines" && batches[2].rows.length === 2
  )
  check(
    "the registrations follow the lines they reference",
    batches[3].table === "order_registrations"
  )

  console.log("\nThe success page groups registrations by their line")
  // The same join `RegistrationList` renders from: one card per registration,
  // under the line it points at, in line order.
  const byLineId = new Map(rows.registrations.map((row) => [row.line_id, row]))
  const cards = rows.lines.flatMap((line) => {
    const found = byLineId.get(line.id)
    return found ? [{ line, registration: found }] : []
  })
  check("one registration card is rendered", cards.length === 1)
  check(
    "grouped under its own line",
    cards[0]?.line.description === "Golf Outing Registration" &&
      cards[0]?.line.line_index === 0
  )
  check(
    "the add-on lines carry no registration of their own",
    rows.lines.slice(1).every((line) => !byLineId.has(line.id))
  )

  if (failures > 0) {
    throw new Error(`${failures} registration assertion(s) failed`)
  }

  console.log("\nRegistration lines OK.")
}

try {
  main()
} catch (err) {
  console.error(`\n${err instanceof Error ? err.message : err}`)
  process.exitCode = 1
}
