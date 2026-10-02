import type Stripe from "stripe"
import { describe, expect, it } from "vitest"

import {
  applyQuantityChange,
  planQuantityChange,
  registrationRowCount,
  rowsOf,
  type CollectorAnswers,
} from "@/components/collector-form/rows"
import {
  isChoiceField,
  isCollectorEntry,
  parseCartEntries,
  pricedLines,
  type CollectorField,
} from "@/lib/checkout/cart-entries"
import {
  addGroup,
  removeEntry,
  type CartAddGroup,
  type IdFactory,
} from "@/lib/checkout/cart-mutations"
import { quoteCart, type ProductPriceRecord } from "@/lib/checkout/cart-pricing"
import { buildOrderMetadata } from "@/lib/checkout/order-metadata"
import {
  buildOrderRows,
  orderInsertPlan,
  orderLineId,
} from "@/lib/checkout/order-rows"

/**
 * The registration-bearing lines chain (ticket #83) — the `quantity → rows`
 * rule, the add-to-cart group, the Stripe metadata and the durable order rows,
 * with the golf outing as the worked example, across
 * `@/lib/checkout/cart-entries`, `@/lib/checkout/cart-mutations`,
 * `@/components/collector-form/rows`, `@/lib/checkout/cart-pricing`,
 * `@/lib/checkout/order-metadata` and `@/lib/checkout/order-rows`.
 *
 * Ported 1:1 from `scripts/registration-round-trip.ts` when the round-trip
 * scripts were replaced by the Vitest pure layer (#128). One `it` per original
 * `check`, named with its label, grouped by the original section headings.
 * Simple comparisons became `expect(actual).toBe(expected)`; compound conditions
 * are asserted verbatim. Assertions are carried over, not re-derived.
 *
 * It is co-located with `order-rows.ts` because the durable order rows are the
 * artifact the chain produces. Entirely offline — no Stripe, DatoCMS or Supabase
 * credentials: the sku → `product` records and the retrieved Checkout Session
 * are fixtures, exactly as the builders receive them.
 */

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
 * A sponsorship's DataCollector as DatoCMS holds it — business, the logo question
 * as a `radio`, and the contact address. The trailing `checkbox` is **not** on the
 * live collector: the type is new and nothing uses it yet, so it rides here to
 * prove a boolean field round-trips like any other.
 */
const SPONSORSHIP_FIELDS: CollectorField[] = [
  {
    name: "businessName",
    label: "Business name",
    type: "text",
    required: true,
  },
  {
    name: "logo",
    label: "Sending a logo",
    type: "radio",
    required: true,
    options: ["Yes", "No"],
  },
  {
    name: "sponsorEmail",
    label: "Sponsor contact email",
    type: "email",
    required: true,
  },
  {
    name: "acknowledged",
    label: "I have read the sponsorship terms",
    type: "checkbox",
  },
]

const SPONSORSHIP_ANSWERS = {
  businessName: "Acme Corp",
  logo: "Yes",
  sponsorEmail: "cfo@acme.example",
  acknowledged: "true",
}

/** One add-to-cart action as the sponsorship PDP commits it. */
function sponsorAdd(): CartAddGroup {
  return {
    primaries: [
      { sku: "golf-sponsor-masters", quantity: 1, quantityBearing: false },
    ],
    collector: {
      collectorRef: "golf-outing-sponsorship-collector",
      answers: SPONSORSHIP_ANSWERS,
      fields: SPONSORSHIP_FIELDS,
    },
  }
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

// --- the chain, built in the script's order ----------------------------------

const ids = idFactory()
const cart = addGroup([], golfAdd(), {
  sourcePdp: "golf-outing",
  idFactory: ids,
})
const lines = pricedLines(cart)
const collectors = cart.filter(isCollectorEntry)
const primary = lines[0]
const [mulligan, drinkBand] = lines.slice(1)

const twice = addGroup(cart, golfAdd(), {
  sourcePdp: "golf-outing",
  idFactory: ids,
})
const primaries = pricedLines(twice).filter((line) => !line.parentId)
const registrations = twice.filter(isCollectorEntry)

const mulligans = pricedLines(twice).filter(
  (line) => line.sku === "golf-outing-mulligan"
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

const removed = removeEntry(twice, primaries[0].id)
const survivingAddon = pricedLines(removed).find((line) => line.parentId)
const withoutAddon = removeEntry(removed, survivingAddon?.id ?? "")

const quoted = quoteCart(cart, RECORDS, { now: AT })
const metadata = buildOrderMetadata(cart, CART_REF)

const reloaded = parseCartEntries(JSON.parse(JSON.stringify(cart)))
const reloadedCollector = reloaded.filter(isCollectorEntry)[0]

const sponsorCart = addGroup([], sponsorAdd(), {
  sourcePdp: "golf-outing-sponsorship",
  idFactory: idFactory(),
})
const sponsorCollector = sponsorCart.filter(isCollectorEntry)[0]
const sponsorLine = sponsorCart.find((entry) => !isCollectorEntry(entry))
const sponsorReloaded = parseCartEntries(
  JSON.parse(JSON.stringify(sponsorCart))
)
const sponsorReloadedCollector = sponsorReloaded.filter(isCollectorEntry)[0]

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

const rows = buildOrderRows(session, cart)
const registration = rows.registrations[0]

const stored = JSON.parse(JSON.stringify(rows)) as typeof rows

const batches = orderInsertPlan(rows)

// --- assertions --------------------------------------------------------------

describe("`quantity → rows` mirrors the repeatable field", () => {
  it("quantity 1 still renders one row", () => {
    expect(
      registrationRowCount(1, 3) === 1 && registrationRowCount(0, 3) === 1
    ).toBe(true)
  })

  it("the remaining players are quantity − 1", () => {
    expect(
      registrationRowCount(2, 3) === 1 &&
        registrationRowCount(3, 3) === 2 &&
        registrationRowCount(4, 3) === 3
    ).toBe(true)
  })

  it("the field's max caps the rows", () => {
    expect(registrationRowCount(9, 3)).toBe(3)
  })

  it("a field with no max is the remaining players", () => {
    expect(registrationRowCount(4)).toBe(3)
  })

  it("a field holding no rows reads as one empty row", () => {
    expect(same(rowsOf({}, "golfers"), [""])).toBe(true)
  })
})

describe("A quantity change adds and drops player rows", () => {
  const typed: CollectorAnswers = {
    captainName: "Jane Smith",
    teamName: "Forge Old Boys",
    golfers: ["Mike Torres"],
  }
  const grown = applyQuantityChange(FIELDS, typed, 4)

  const named: CollectorAnswers = { ...typed, golfers: [...ANSWERS.golfers] }
  const shrunk = applyQuantityChange(FIELDS, named, 2)

  const before = JSON.stringify(named)
  const planned = planQuantityChange(FIELDS, named, 2)

  it("raising the quantity grows the rows", () => {
    expect(grown.rowCount === 3 && grown.values.golfers.length === 3).toBe(true)
  })

  it("the rows already typed are kept", () => {
    expect(grown.values.golfers[0]).toBe("Mike Torres")
  })

  it("the rows it added are empty", () => {
    expect(
      rowsOf(grown.values, "golfers")
        .slice(1)
        .every((row) => row === "")
    ).toBe(true)
  })

  it("raising the quantity drops nothing", () => {
    expect(grown.dropped.length).toBe(0)
  })

  it("a non-repeatable field is untouched", () => {
    expect(
      grown.values.captainName === "Jane Smith" &&
        grown.values.teamName === "Forge Old Boys"
    ).toBe(true)
  })

  it("lowering the quantity shrinks the rows", () => {
    expect(shrunk.rowCount === 1 && shrunk.values.golfers.length === 1).toBe(true)
  })

  it("the surviving row keeps its value", () => {
    expect(shrunk.values.golfers[0]).toBe("Mike Torres")
  })

  it("the named rows it dropped are reported, so a caller can warn", () => {
    expect(same(shrunk.dropped, ["Priya Nair", "Dana Cole"])).toBe(true)
  })

  it("dropping a blank row is not reported", () => {
    expect(
      applyQuantityChange(
        FIELDS,
        { ...typed, golfers: ["Mike Torres", "", ""] },
        2
      ).dropped.length
    ).toBe(0)
  })

  it("the floor holds at one row", () => {
    expect(applyQuantityChange(FIELDS, named, 1).values.golfers.length).toBe(1)
  })

  it("planning a change commits nothing", () => {
    expect(
      JSON.stringify(named) === before &&
        planned.rowCount === 1 &&
        same(planned.dropped, ["Priya Nair", "Dana Cole"])
    ).toBe(true)
  })
})

describe("One add-to-cart commits a fully specified group", () => {
  it("the group is three priced lines and one collector entry", () => {
    expect(cart.length).toBe(4)
  })

  it("the registration is the primary", () => {
    expect(
      primary?.sku === "golf-outing-registration" &&
        primary.quantity === 4 &&
        primary.quantityBearing === true &&
        primary.parentId === undefined
    ).toBe(true)
  })

  it("both add-ons are priced lines linked by parentId", () => {
    expect(
      mulligan?.sku === "golf-outing-mulligan" &&
        mulligan.quantity === 4 &&
        mulligan.parentId === primary.id &&
        drinkBand?.sku === "golf-outing-drink-band" &&
        drinkBand.quantity === 2 &&
        drinkBand.parentId === primary.id
    ).toBe(true)
  })

  it("the add-ons keep their own source and group", () => {
    expect(
      lines.every(
        (line) =>
          line.sourcePdp === "golf-outing" && line.groupRef === primary.groupRef
      )
    ).toBe(true)
  })

  it("one collector entry rides the primary", () => {
    expect(
      collectors.length === 1 && collectors[0].parentId === primary.id
    ).toBe(true)
  })

  it("the collector entry snapshots the field definitions", () => {
    expect(
      same(collectors[0].fields, FIELDS) &&
        collectors[0].collectorRef === "golf-outing-collector"
    ).toBe(true)
  })

  it("the collector entry carries the answers", () => {
    expect(same(collectors[0].answers, ANSWERS)).toBe(true)
  })
})

describe("A second registration is a new line plus collector entry", () => {
  it("two registration primaries, neither merged", () => {
    expect(primaries.length).toBe(2)
  })

  it("the second registration did not absorb the first", () => {
    expect(primaries.every((line) => line.quantity === 4)).toBe(true)
  })

  it("one collector entry per registration", () => {
    expect(registrations.length).toBe(2)
  })

  it("each collector rides its own line", () => {
    expect(
      new Set(registrations.map((entry) => entry.parentId)).size === 2 &&
        registrations.every((entry) =>
          primaries.some((line) => line.id === entry.parentId)
        )
    ).toBe(true)
  })

  it("the same sku rides two lines at once", () => {
    expect(mulligans.length).toBe(2)
  })

  it("add-ons key on (sku, parentId), so they stay apart", () => {
    expect(new Set(mulligans.map((line) => line.parentId)).size).toBe(2)
  })

  it("a repeated add-on sku under one primary merges", () => {
    expect(mergedAddon.length).toBe(1)
  })

  it("the merged quantities sum", () => {
    expect(
      mergedAddon[0]?.quantity === 3 &&
        mergedAddon[0]?.parentId ===
          pricedLines(repeated).find((line) => !line.parentId)?.id
    ).toBe(true)
  })
})

describe("Removing a primary cascades to its add-ons and collector entry", () => {
  it("the primary is gone", () => {
    expect(!removed.some((entry) => entry.id === primaries[0].id)).toBe(true)
  })

  it("its add-ons go with it", () => {
    expect(!removed.some((entry) => entry.parentId === primaries[0].id)).toBe(
      true
    )
  })

  it("its collector entry goes with it", () => {
    expect(removed.filter(isCollectorEntry).length).toBe(1)
  })

  it("the other registration keeps its line, its add-ons and its entry", () => {
    expect(
      removed.length === 4 &&
        pricedLines(removed).filter((line) => !line.parentId).length === 1
    ).toBe(true)
  })

  it("removing one add-on leaves its primary and registration alone", () => {
    expect(
      withoutAddon.length === 3 &&
        pricedLines(withoutAddon).filter((line) => !line.parentId).length === 1 &&
        withoutAddon.filter(isCollectorEntry).length === 1
    ).toBe(true)
  })
})

describe("A registration plus both add-ons is one session", () => {
  it("the line items are the priced lines, in cart order", () => {
    expect(quoted.lines.map((line) => line.sku).join(",")).toBe(
      "golf-outing-registration,golf-outing-mulligan,golf-outing-drink-band"
    )
  })

  it("the collector entry never becomes a line item", () => {
    expect(quoted.lines.length).toBe(3)
  })

  it("quantities ride the line items", () => {
    expect(quoted.lines.map((line) => line.quantity).join(",")).toBe("4,4,2")
  })

  it("every line bills at the Price the CMS names", () => {
    // The CMS's `price_id` is the override; the catalog's is the default under it.
    expect(
      quoted.lines.every(
        (line) => line.priceId === RECORDS.get(line.sku)?.priceId
      )
    ).toBe(true)
  })

  it("nothing is refused", () => {
    expect(quoted.errors.length).toBe(0)
  })

  it("the session is a golf order", () => {
    expect(metadata.metadata.families).toBe("golf")
  })

  it("one registration", () => {
    expect(metadata.metadata.reg_count).toBe("1")
  })

  it("reg_ref is the cartRef", () => {
    expect(metadata.metadata.reg_ref).toBe(CART_REF)
  })

  it("reg_0 is the registration's roster", () => {
    expect(metadata.metadata.reg_0).toBe(
      "Golf Outing Registration x4: Jane Smith, Forge Old Boys, Mike Torres, Priya Nair, Dana Cole"
    )
  })
})

describe("The reg_N summary inherits to the add-ons", () => {
  it("the first add-on inherits the roster under its own name", () => {
    expect(metadata.metadata.reg_1).toBe(
      "Golf Outing — Mulligan (4 + contest entry) x4: Jane Smith, Forge Old Boys, Mike Torres, Priya Nair, Dana Cole"
    )
  })

  it("so does the second", () => {
    expect(metadata.metadata.reg_2).toBe(
      "Golf Outing — All You Can Drink x2: Jane Smith, Forge Old Boys, Mike Torres, Priya Nair, Dana Cole"
    )
  })

  it("the collector entry takes no reg_N slot of its own", () => {
    expect(metadata.metadata.reg_3).toBeUndefined()
  })
})

describe("The registration survives the browser round trip", () => {
  it("every entry comes back", () => {
    expect(reloaded.length).toBe(cart.length)
  })

  it("deep-equal after the round trip", () => {
    expect(same(reloaded, cart)).toBe(true)
  })

  it("the field snapshot survives", () => {
    expect(same(reloadedCollector?.fields, FIELDS)).toBe(true)
  })

  it("the answers survive", () => {
    expect(same(reloadedCollector?.answers, ANSWERS)).toBe(true)
  })
})

describe("A sponsorship's choice fields survive the browser round trip", () => {
  it("the collector rides the tier line", () => {
    expect(
      Boolean(sponsorLine) && sponsorCollector?.parentId === sponsorLine?.id
    ).toBe(true)
  })

  it("the radio keeps its options", () => {
    expect(
      same(
        sponsorCollector?.fields
          .filter(isChoiceField)
          .find((field) => field.name === "logo")?.options,
        ["Yes", "No"]
      )
    ).toBe(true)
  })

  it("the checkbox keeps its type", () => {
    expect(
      sponsorCollector?.fields.find((field) => field.name === "acknowledged")
        ?.type
    ).toBe("checkbox")
  })

  it("every entry comes back", () => {
    expect(sponsorReloaded.length).toBe(sponsorCart.length)
  })

  it("the field snapshot deep-equals after the round trip", () => {
    expect(same(sponsorReloadedCollector?.fields, SPONSORSHIP_FIELDS)).toBe(true)
  })

  it("the answers deep-equal after the round trip", () => {
    expect(same(sponsorReloadedCollector?.answers, SPONSORSHIP_ANSWERS)).toBe(
      true
    )
  })
})

describe("`order_registrations` rows land with fields and answers", () => {
  it("the header carries the family and the cartRef", () => {
    expect(
      rows.header.families.join(",") === "golf" &&
        rows.header.client_reference_id === CART_REF
    ).toBe(true)
  })

  it("three order lines", () => {
    expect(rows.lines.length).toBe(3)
  })

  it("line_index is 0-based in session order", () => {
    expect(rows.lines.map((line) => line.line_index).join(",")).toBe("0,1,2")
  })

  it("the primary line has no parent", () => {
    expect(rows.lines[0].parent_line_id).toBeNull()
  })

  it("each add-on line hangs off the primary", () => {
    expect(
      rows.lines[1].parent_line_id === orderLineId(SESSION_ID, 0) &&
        rows.lines[2].parent_line_id === orderLineId(SESSION_ID, 0)
    ).toBe(true)
  })

  it("one registration row, against the primary line", () => {
    expect(rows.registrations.length).toBe(1)
  })

  it("the registration is tied to that line", () => {
    expect(
      registration?.line_id === orderLineId(SESSION_ID, 0) &&
        registration?.id === registration?.line_id
    ).toBe(true)
  })

  it("the collector ref lands", () => {
    expect(registration?.collector_ref).toBe("golf-outing-collector")
  })

  it("fields land as the add-time snapshot", () => {
    expect(same(registration?.fields, FIELDS)).toBe(true)
  })

  it("answers land raw", () => {
    expect(same(registration?.answers, ANSWERS)).toBe(true)
  })

  it("the summary is the reg_N string the session carried", () => {
    expect(registration?.summary).toBe(metadata.metadata.reg_0)
  })

  it("fields survive the jsonb round trip", () => {
    expect(same(stored.registrations[0].fields, FIELDS)).toBe(true)
  })

  it("answers survive the jsonb round trip", () => {
    expect(same(stored.registrations[0].answers, ANSWERS)).toBe(true)
  })

  it("the header is written first", () => {
    expect(batches[0].table).toBe("orders")
  })

  it("primaries are inserted before add-ons", () => {
    expect(
      batches[1].table === "order_lines" && batches[1].rows.length === 1
    ).toBe(true)
  })

  it("the add-ons follow them", () => {
    expect(
      batches[2].table === "order_lines" && batches[2].rows.length === 2
    ).toBe(true)
  })

  it("the registrations follow the lines they reference", () => {
    expect(batches[3].table).toBe("order_registrations")
  })
})

describe("The success page groups registrations by their line", () => {
  // The same join `RegistrationList` renders from: one card per registration,
  // under the line it points at, in line order.
  const byLineId = new Map(rows.registrations.map((row) => [row.line_id, row]))
  const cards = rows.lines.flatMap((line) => {
    const found = byLineId.get(line.id)
    return found ? [{ line, registration: found }] : []
  })

  it("one registration card is rendered", () => {
    expect(cards.length).toBe(1)
  })

  it("grouped under its own line", () => {
    expect(
      cards[0]?.line.description === "Golf Outing Registration" &&
        cards[0]?.line.line_index === 0
    ).toBe(true)
  })

  it("the add-on lines carry no registration of their own", () => {
    expect(rows.lines.slice(1).every((line) => !byLineId.has(line.id))).toBe(true)
  })
})
