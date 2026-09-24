/**
 * Smoke check for the checkout build's pure halves (ticket #82): the price and
 * availability quote in `src/lib/checkout/cart-pricing.ts` and the Stripe
 * metadata builder in `src/lib/checkout/order-metadata.ts`.
 *
 * Everything asserted here is offline — no Stripe, DatoCMS or Supabase
 * credentials — because these functions take the cart's entries and the sku →
 * DatoCMS `product` records as *given*, and derive every quoted line and every
 * refusal from them. The reads that produce those records, and the session
 * build that consumes them, are exercised by a real checkout.
 *
 * It covers what the acceptance criteria turn on: the sale window selecting the
 * sale price (or not), a refusal that names its line instead of dropping it,
 * and the `families` / `reg_N` / `reg_count` / `reg_ref` metadata — including
 * the truncation and >50-key overflow rules.
 *
 *   node --import tsx scripts/checkout-pricing-round-trip.ts
 *   pnpm checkout:round-trip
 */

import type {
  CartEntry,
  CollectorEntry,
  CollectorField,
  PricedLine,
} from "../src/lib/checkout/cart-entries"
import {
  effectivePriceId,
  isSaleRunning,
  quoteCart,
  resolveLinePriceId,
  type CartLineError,
  type ProductPriceRecord,
} from "../src/lib/checkout/cart-pricing"
import { findCatalogItem } from "../src/lib/checkout/catalog"
import {
  buildOrderMetadata,
  registrationNames,
} from "../src/lib/checkout/order-metadata"

// --- fixtures ----------------------------------------------------------------

/** The sale window every fixture below is tested against. */
const SALE_START = "2026-09-01T12:00:00Z"
const SALE_END = "2026-09-30T12:00:00Z"

const at = (iso: string) => new Date(iso)

function record(
  sku: string,
  overrides: Partial<ProductPriceRecord> = {}
): ProductPriceRecord {
  return {
    sku,
    inStock: true,
    priceId: `price_regular_${sku}`,
    salePriceId: null,
    saleStartsAt: null,
    saleEndsAt: null,
    ...overrides,
  }
}

/** A product mid-sale: the sale price applies inside its window. */
const onSale = record("golf-outing-registration", {
  salePriceId: "price_sale_golf-outing-registration",
  saleStartsAt: SALE_START,
  saleEndsAt: SALE_END,
})

const RECORDS = new Map<string, ProductPriceRecord>([
  [onSale.sku, onSale],
  ["golf-outing-mulligan", record("golf-outing-mulligan")],
  ["annual-forge-pig-roast", record("annual-forge-pig-roast")],
  ["donation-club-preset-25", record("donation-club-preset-25")],
  ["sc7s-mens-open", record("sc7s-mens-open", { inStock: false })],
  // A live-mode price requirement with an empty CMS field — the catalog covers it.
  ["dues-fall", record("dues-fall", { priceId: null })],
])

const GOLF_FIELDS: CollectorField[] = [
  { name: "captain", label: "Captain", type: "text", required: true },
  { name: "golfers", label: "Players", type: "text", repeatable: true, max: 3 },
]

function line(
  id: string,
  sku: string,
  quantity = 1,
  parentId?: string
): PricedLine {
  return {
    id,
    kind: "product",
    sku,
    quantity,
    sourcePdp: "golf-outing",
    groupRef: "group-1",
    ...(parentId ? { parentId } : {}),
  }
}

function collector(
  id: string,
  parentId: string,
  answers: Record<string, unknown>
): CollectorEntry {
  return {
    id,
    kind: "collector",
    collectorRef: "golf-outing-collector",
    answers,
    fields: GOLF_FIELDS,
    sourcePdp: "golf-outing",
    groupRef: "group-1",
    parentId,
  }
}

const GOLF_ENTRIES: CartEntry[] = [
  line("line-golf", "golf-outing-registration", 2),
  collector("collector-golf", "line-golf", {
    captain: "Jane Smith",
    golfers: ["Mike Torres"],
  }),
  line("line-mulligan", "golf-outing-mulligan", 2, "line-golf"),
  line("line-pig-roast", "annual-forge-pig-roast"),
  line("line-donation", "donation-club-preset-25"),
]

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

/** The refusal for a given entry, if any. */
function refusal(
  errors: CartLineError[],
  entryId: string
): CartLineError | undefined {
  return errors.find((error) => error.entryId === entryId)
}

function main(): void {
  console.log("A running sale selects the sale price")
  check(
    "before the window: the regular price",
    effectivePriceId(onSale, at("2026-08-31T12:00:00Z")) === onSale.priceId
  )
  check(
    "inside the window: the sale price",
    effectivePriceId(onSale, at("2026-09-15T12:00:00Z")) === onSale.salePriceId
  )
  check(
    "at the window's exact start: the sale price (inclusive)",
    effectivePriceId(onSale, at(SALE_START)) === onSale.salePriceId
  )
  check(
    "at the window's exact end: the sale price (inclusive)",
    effectivePriceId(onSale, at(SALE_END)) === onSale.salePriceId
  )
  check(
    "after the window: the regular price again",
    effectivePriceId(onSale, at("2026-10-01T12:00:00Z")) === onSale.priceId
  )
  check(
    "an empty start does not hold the sale off",
    effectivePriceId(
      record("x", { salePriceId: "price_sale_x", saleEndsAt: SALE_END }),
      at("2026-09-15T12:00:00Z")
    ) === "price_sale_x"
  )
  check(
    "an empty end does not end the sale",
    effectivePriceId(
      record("x", { salePriceId: "price_sale_x", saleStartsAt: SALE_START }),
      at("2026-11-15T12:00:00Z")
    ) === "price_sale_x"
  )
  check(
    "a sale price with no window at all is on sale",
    effectivePriceId(
      record("x", { salePriceId: "price_sale_x" }),
      at("2026-09-15T12:00:00Z")
    ) === "price_sale_x"
  )
  check(
    "a future start holds the sale off",
    effectivePriceId(
      record("x", {
        salePriceId: "price_sale_x",
        saleStartsAt: "2027-01-01T00:00:00Z",
      }),
      at("2026-09-15T12:00:00Z")
    ) === "price_regular_x"
  )
  check(
    "a past end ends the sale",
    effectivePriceId(
      record("x", {
        salePriceId: "price_sale_x",
        saleEndsAt: "2026-01-01T00:00:00Z",
      }),
      at("2026-09-15T12:00:00Z")
    ) === "price_regular_x"
  )
  check(
    "a bound present but unreadable refuses to discount",
    !isSaleRunning(
      record("x", { salePriceId: "price_sale_x", saleStartsAt: "not-a-date" }),
      at("2026-09-15T12:00:00Z")
    )
  )
  check(
    "a product with no sale price resolves to the regular price",
    effectivePriceId(
      record("annual-forge-pig-roast"),
      at("2026-09-15T12:00:00Z")
    ) === "price_regular_annual-forge-pig-roast"
  )

  console.log("\nA blank CMS price falls back to the provisioned catalog price")
  const golfItem = findCatalogItem("golf-outing-registration")
  check("the fixture sku is in the catalog", Boolean(golfItem?.priceId))
  check(
    "the CMS's effective price wins when it names one",
    resolveLinePriceId(onSale, golfItem!, at("2026-09-15T12:00:00Z")) ===
      onSale.salePriceId
  )
  check(
    "a blank CMS price falls back to the catalog's",
    resolveLinePriceId(
      record("golf-outing-registration", { priceId: null }),
      golfItem!,
      at("2026-09-15T12:00:00Z")
    ) === golfItem!.priceId
  )
  check(
    "no price in either source resolves to null",
    resolveLinePriceId(
      null,
      { sku: "x", label: "X", unitAmount: 100 },
      at("2026-09-15T12:00:00Z")
    ) === null
  )

  console.log("\nA refusal names its line and never drops one")
  const quoted = quoteCart(GOLF_ENTRIES, RECORDS, {
    now: at("2026-09-15T12:00:00Z"),
  })
  check(
    "the quoted lines are the cart's priced lines, in cart order",
    quoted.lines.map((q) => q.entryId).join(",") ===
      "line-golf,line-mulligan,line-pig-roast,line-donation"
  )
  check("collector entries never become line items", quoted.lines.length === 4)
  check(
    "a quoted line carries its catalog family",
    quoted.lines.every((line) => typeof line.family === "string")
  )
  check(
    "the registration line is quoted at its sale price",
    quoted.lines[0].priceId === "price_sale_golf-outing-registration"
  )
  check("a healthy cart raises no errors", quoted.errors.length === 0)

  const refusedCart: CartEntry[] = [
    ...GOLF_ENTRIES,
    line("line-sold-out", "sc7s-mens-open"),
    line("line-unknown-sku", "not-a-sku"),
    // A catalog sku with no DatoCMS record at all.
    line("line-no-record", "nfl-survivor-pool-ticket"),
    line("line-unpriced", "dues-fall"),
  ]
  const refused = quoteCart(refusedCart, RECORDS, {
    now: at("2026-09-15T12:00:00Z"),
    requirePriceId: true,
  })
  check(
    "the sold-out line is still quoted, never silently dropped",
    refused.lines.some((q) => q.entryId === "line-sold-out")
  )
  check(
    "the sold-out line is refused by name",
    refusal(refused.errors, "line-sold-out")?.code === "sold-out"
  )
  check("the valid lines beside it are untouched", refused.lines.length === 6)
  check(
    "an unknown sku is refused as unknown-sku",
    refusal(refused.errors, "line-unknown-sku")?.code === "unknown-sku"
  )
  check(
    "a sku with no CMS record is refused as unknown-product",
    refusal(refused.errors, "line-no-record")?.code === "unknown-product"
  )
  // `unpriced` needs a catalog item with no provisioned Price, which none has —
  // it is the last-resort guard when neither source can name a price.
  check(
    "a blank CMS price is not a refusal — the catalog covers it",
    refusal(refused.errors, "line-unpriced") === undefined &&
      refused.lines.find((q) => q.entryId === "line-unpriced")?.priceId ===
        findCatalogItem("dues-fall")?.priceId
  )
  check(
    "test mode does not require a price id",
    quoteCart([line("line-unpriced", "dues-fall")], RECORDS).errors.length === 0
  )
  check(
    "every refusal names a cart entry the buyer can remove",
    refused.errors.every((error) =>
      refusedCart.some((entry) => entry.id === error.entryId)
    )
  )

  console.log("\nRegistration names come from the entry's own field snapshot")
  const golfCollector = GOLF_ENTRIES[1] as CollectorEntry
  check(
    "answered fields in field order, repeatables flattened",
    registrationNames(golfCollector).join(" | ") === "Jane Smith | Mike Torres"
  )
  check(
    "a blank answer is dropped",
    registrationNames({
      ...golfCollector,
      answers: { captain: "  ", golfers: ["", "Mike Torres", null] },
    }).join(" | ") === "Mike Torres"
  )
  check(
    "a { name, email } answer reads as both",
    registrationNames({
      ...golfCollector,
      answers: { captain: { name: "Jane Smith", email: "jane@example.com" } },
    })[0] === "Jane Smith · jane@example.com"
  )
  check(
    "a field the buyer never answered contributes nothing",
    registrationNames({ ...golfCollector, answers: {} }).length === 0
  )

  console.log("\nThe session metadata")
  const plan = buildOrderMetadata(GOLF_ENTRIES, "cart-ref-1")
  check(
    "families are the distinct families, in cart order",
    plan.metadata.families === "golf,events,donation"
  )
  check(
    "reg_count counts registrations, not lines",
    plan.metadata.reg_count === "1"
  )
  check("reg_ref is the cartRef", plan.metadata.reg_ref === "cart-ref-1")
  check(
    "reg_0 is the registration line's summary",
    plan.metadata.reg_0 ===
      "Golf Outing Registration x2: Jane Smith, Mike Torres"
  )
  check(
    "an add-on inherits its primary's roster under its own name",
    plan.metadata.reg_1 ===
      "Golf Outing — Mulligan (4 + contest entry) x2: Jane Smith, Mike Torres"
  )
  check(
    "a line with no primary gets no reg key",
    plan.metadata.reg_2 === undefined && plan.metadata.reg_3 === undefined
  )
  check(
    "no line overflows a 5-line cart",
    Object.keys(plan.lineMetadata).length === 0
  )

  console.log("\nThe metadata caps")
  const many = Array.from({ length: 60 }, (_, index) => {
    const id = `line-${index}`
    return [
      line(id, "annual-forge-pig-roast"),
      collector(`collector-${index}`, id, {
        captain: `Captain ${index}`,
        golfers: [`Player ${index}`],
      }),
    ]
  }).flat()
  const overflow = buildOrderMetadata(many, "cart-ref-2")
  const overflowKeys = Object.keys(overflow.metadata)
  check(
    "the session map stays within Stripe's 50-key limit",
    overflowKeys.length <= 50
  )
  check(
    "the keys that no longer fit ride on their line items",
    Object.keys(overflow.lineMetadata).length === 60 - (overflowKeys.length - 3)
  )
  check(
    "reg_count counts every registration",
    overflow.metadata.reg_count === "60"
  )

  const longNames = Array.from(
    { length: 60 },
    (_, i) => `Registrant ${i} With A Long Name`
  )
  const capped = buildOrderMetadata(
    [
      line("line-long", "golf-outing-registration", 60),
      collector("collector-long", "line-long", {
        captain: longNames[0],
        golfers: longNames.slice(1),
      }),
    ],
    "cart-ref-3"
  ).metadata.reg_0
  check(
    "an over-long summary is capped at 500 characters",
    capped.length <= 500
  )
  check(
    "the capped summary says how many it dropped",
    /… \+\d+ more$/.test(capped)
  )
  check(
    "the capped summary keeps its header",
    capped.startsWith("Golf Outing Registration x60: Registrant 0")
  )

  if (failures > 0) {
    throw new Error(`${failures} checkout assertion(s) failed`)
  }

  console.log("\nCheckout pricing and metadata OK.")
}

try {
  main()
} catch (err) {
  console.error(`\n${err instanceof Error ? err.message : err}`)
  process.exitCode = 1
}
