import { describe, expect, it } from "vitest"

import type {
  CartEntry,
  CollectorEntry,
  CollectorField,
  PricedLine,
} from "@/lib/checkout/cart-entries"
import {
  effectivePriceId,
  isSaleRunning,
  quoteCart,
  resolveLinePriceId,
  type CartLineError,
  type ProductPriceRecord,
} from "@/lib/checkout/cart-pricing"
import { findCatalogItem } from "@/lib/checkout/catalog"
import {
  buildOrderMetadata,
  registrationNames,
} from "@/lib/checkout/order-metadata"

/**
 * Checkout pricing and order metadata (ticket #82) — the price and availability
 * quote in `@/lib/checkout/cart-pricing` and the Stripe metadata builder in
 * `@/lib/checkout/order-metadata`.
 *
 * Ported 1:1 from `scripts/checkout-pricing-round-trip.ts` when the round-trip
 * scripts were replaced by the Vitest pure layer (#128). One `it` per original
 * `check`, named with its label, grouped by the original section headings.
 * Simple comparisons became `expect(actual).toBe(expected)`; compound
 * conditions are asserted verbatim. Assertions are carried over, not
 * re-derived.
 *
 * Entirely offline — no Stripe, DatoCMS or Supabase credentials.
 */

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

/** A sponsorship tier's DataCollector as DatoCMS holds it. */
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
]

/** The tier skus' DatoCMS `product` records — in stock, no sale running. */
const SPONSORSHIP_RECORDS = new Map<string, ProductPriceRecord>([
  ["golf-sponsor-masters", record("golf-sponsor-masters")],
])

/** One sponsorship purchase: the chosen tier line and its collector. */
const SPONSORSHIP_ENTRIES: CartEntry[] = [
  {
    id: "line-sponsor",
    kind: "product",
    sku: "golf-sponsor-masters",
    quantity: 1,
    sourcePdp: "golf-outing-sponsorship",
    groupRef: "group-sponsor",
  },
  {
    id: "collector-sponsor",
    kind: "collector",
    collectorRef: "golf-outing-sponsorship-collector",
    answers: {
      businessName: "Acme Corp",
      logo: "Yes",
      sponsorEmail: "cfo@acme.example",
    },
    fields: SPONSORSHIP_FIELDS,
    sourcePdp: "golf-outing-sponsorship",
    groupRef: "group-sponsor",
    parentId: "line-sponsor",
  },
]

/** The refusal for a given entry, if any. */
function refusal(
  errors: CartLineError[],
  entryId: string
): CartLineError | undefined {
  return errors.find((error) => error.entryId === entryId)
}

// --- assertions --------------------------------------------------------------

describe("A running sale selects the sale price", () => {
  it("before the window: the regular price", () => {
    expect(effectivePriceId(onSale, at("2026-08-31T12:00:00Z"))).toBe(
      onSale.priceId
    )
  })

  it("inside the window: the sale price", () => {
    expect(effectivePriceId(onSale, at("2026-09-15T12:00:00Z"))).toBe(
      onSale.salePriceId
    )
  })

  it("at the window's exact start: the sale price (inclusive)", () => {
    expect(effectivePriceId(onSale, at(SALE_START))).toBe(onSale.salePriceId)
  })

  it("at the window's exact end: the sale price (inclusive)", () => {
    expect(effectivePriceId(onSale, at(SALE_END))).toBe(onSale.salePriceId)
  })

  it("after the window: the regular price again", () => {
    expect(effectivePriceId(onSale, at("2026-10-01T12:00:00Z"))).toBe(
      onSale.priceId
    )
  })

  it("an empty start does not hold the sale off", () => {
    expect(
      effectivePriceId(
        record("x", { salePriceId: "price_sale_x", saleEndsAt: SALE_END }),
        at("2026-09-15T12:00:00Z")
      )
    ).toBe("price_sale_x")
  })

  it("an empty end does not end the sale", () => {
    expect(
      effectivePriceId(
        record("x", { salePriceId: "price_sale_x", saleStartsAt: SALE_START }),
        at("2026-11-15T12:00:00Z")
      )
    ).toBe("price_sale_x")
  })

  it("a sale price with no window at all is on sale", () => {
    expect(
      effectivePriceId(
        record("x", { salePriceId: "price_sale_x" }),
        at("2026-09-15T12:00:00Z")
      )
    ).toBe("price_sale_x")
  })

  it("a future start holds the sale off", () => {
    expect(
      effectivePriceId(
        record("x", {
          salePriceId: "price_sale_x",
          saleStartsAt: "2027-01-01T00:00:00Z",
        }),
        at("2026-09-15T12:00:00Z")
      )
    ).toBe("price_regular_x")
  })

  it("a past end ends the sale", () => {
    expect(
      effectivePriceId(
        record("x", {
          salePriceId: "price_sale_x",
          saleEndsAt: "2026-01-01T00:00:00Z",
        }),
        at("2026-09-15T12:00:00Z")
      )
    ).toBe("price_regular_x")
  })

  it("a bound present but unreadable refuses to discount", () => {
    expect(
      !isSaleRunning(
        record("x", {
          salePriceId: "price_sale_x",
          saleStartsAt: "not-a-date",
        }),
        at("2026-09-15T12:00:00Z")
      )
    ).toBe(true)
  })

  it("a product with no sale price resolves to the regular price", () => {
    expect(
      effectivePriceId(
        record("annual-forge-pig-roast"),
        at("2026-09-15T12:00:00Z")
      )
    ).toBe("price_regular_annual-forge-pig-roast")
  })
})

describe("A blank CMS price falls back to the provisioned catalog price", () => {
  const golfItem = findCatalogItem("golf-outing-registration")

  it("the fixture sku is in the catalog", () => {
    expect(Boolean(golfItem?.priceId)).toBe(true)
  })

  it("the CMS's effective price wins when it names one", () => {
    expect(
      resolveLinePriceId(onSale, golfItem!, at("2026-09-15T12:00:00Z"))
    ).toBe(onSale.salePriceId)
  })

  it("a blank CMS price falls back to the catalog's", () => {
    expect(
      resolveLinePriceId(
        record("golf-outing-registration", { priceId: null }),
        golfItem!,
        at("2026-09-15T12:00:00Z")
      )
    ).toBe(golfItem!.priceId)
  })

  it("no price in either source resolves to null", () => {
    expect(
      resolveLinePriceId(
        null,
        { sku: "x", label: "X", unitAmount: 100 },
        at("2026-09-15T12:00:00Z")
      )
    ).toBeNull()
  })
})

describe("A refusal names its line and never drops one", () => {
  const quoted = quoteCart(GOLF_ENTRIES, RECORDS, {
    now: at("2026-09-15T12:00:00Z"),
  })

  it("the quoted lines are the cart's priced lines, in cart order", () => {
    expect(quoted.lines.map((q) => q.entryId).join(",")).toBe(
      "line-golf,line-mulligan,line-pig-roast,line-donation"
    )
  })

  it("collector entries never become line items", () => {
    expect(quoted.lines.length).toBe(4)
  })

  it("a quoted line carries its catalog family", () => {
    expect(quoted.lines.every((line) => typeof line.family === "string")).toBe(
      true
    )
  })

  it("the registration line is quoted at its sale price", () => {
    expect(quoted.lines[0].priceId).toBe(
      "price_sale_golf-outing-registration"
    )
  })

  it("a healthy cart raises no errors", () => {
    expect(quoted.errors.length).toBe(0)
  })

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

  it("the sold-out line is still quoted, never silently dropped", () => {
    expect(refused.lines.some((q) => q.entryId === "line-sold-out")).toBe(true)
  })

  it("the sold-out line is refused by name", () => {
    expect(refusal(refused.errors, "line-sold-out")?.code).toBe("sold-out")
  })

  it("the valid lines beside it are untouched", () => {
    expect(refused.lines.length).toBe(6)
  })

  it("an unknown sku is refused as unknown-sku", () => {
    expect(refusal(refused.errors, "line-unknown-sku")?.code).toBe("unknown-sku")
  })

  it("a sku with no CMS record is refused as unknown-product", () => {
    expect(refusal(refused.errors, "line-no-record")?.code).toBe(
      "unknown-product"
    )
  })

  it("a blank CMS price is not a refusal — the catalog covers it", () => {
    expect(
      refusal(refused.errors, "line-unpriced") === undefined &&
        refused.lines.find((q) => q.entryId === "line-unpriced")?.priceId ===
          findCatalogItem("dues-fall")?.priceId
    ).toBe(true)
  })

  it("test mode does not require a price id", () => {
    expect(
      quoteCart([line("line-unpriced", "dues-fall")], RECORDS).errors.length
    ).toBe(0)
  })

  it("every refusal names a cart entry the buyer can remove", () => {
    expect(
      refused.errors.every((error) =>
        refusedCart.some((entry) => entry.id === error.entryId)
      )
    ).toBe(true)
  })
})

describe("Registration names come from the entry's own field snapshot", () => {
  const golfCollector = GOLF_ENTRIES[1] as CollectorEntry

  it("answered fields in field order, repeatables flattened", () => {
    expect(registrationNames(golfCollector).join(" | ")).toBe(
      "Jane Smith | Mike Torres"
    )
  })

  it("a blank answer is dropped", () => {
    expect(
      registrationNames({
        ...golfCollector,
        answers: { captain: "  ", golfers: ["", "Mike Torres", null] },
      }).join(" | ")
    ).toBe("Mike Torres")
  })

  it("a { name, email } answer reads as both", () => {
    expect(
      registrationNames({
        ...golfCollector,
        answers: { captain: { name: "Jane Smith", email: "jane@example.com" } },
      })[0]
    ).toBe("Jane Smith · jane@example.com")
  })

  it("a field the buyer never answered contributes nothing", () => {
    expect(registrationNames({ ...golfCollector, answers: {} }).length).toBe(0)
  })

  it("an acknowledgement is not a registrant", () => {
    expect(
      registrationNames({
        ...golfCollector,
        fields: [
          ...golfCollector.fields,
          {
            name: "refundAgreement",
            label: "Refund agreement",
            type: "checkbox",
            required: true,
          },
        ],
        answers: { ...golfCollector.answers, refundAgreement: "true" },
      }).join(" | ")
    ).toBe("Jane Smith | Mike Torres")
  })
})

describe("The session metadata", () => {
  const plan = buildOrderMetadata(GOLF_ENTRIES, "cart-ref-1")

  it("families are the distinct families, in cart order", () => {
    expect(plan.metadata.families).toBe("golf,events,donation")
  })

  it("reg_count counts registrations, not lines", () => {
    expect(plan.metadata.reg_count).toBe("1")
  })

  it("reg_ref is the cartRef", () => {
    expect(plan.metadata.reg_ref).toBe("cart-ref-1")
  })

  it("reg_0 is the registration line's summary", () => {
    expect(plan.metadata.reg_0).toBe(
      "Golf Outing Registration x2: Jane Smith, Mike Torres"
    )
  })

  it("an add-on inherits its primary's roster under its own name", () => {
    expect(plan.metadata.reg_1).toBe(
      "Golf Outing — Mulligan (4 + contest entry) x2: Jane Smith, Mike Torres"
    )
  })

  it("a line with no primary gets no reg key", () => {
    expect(
      plan.metadata.reg_2 === undefined && plan.metadata.reg_3 === undefined
    ).toBe(true)
  })

  it("no line overflows a 5-line cart", () => {
    expect(Object.keys(plan.lineMetadata).length).toBe(0)
  })
})

describe("A sponsorship is its own family", () => {
  const sponsorQuote = quoteCart(SPONSORSHIP_ENTRIES, SPONSORSHIP_RECORDS, {
    now: at("2026-09-15T12:00:00Z"),
  })

  it("the tier is quoted as one line, with nothing refused", () => {
    expect(
      sponsorQuote.lines.length === 1 && sponsorQuote.errors.length === 0
    ).toBe(true)
  })

  it("the quoted line carries family=sponsorship", () => {
    expect(sponsorQuote.lines[0]?.family).toBe("sponsorship")
  })

  const sponsorPlan = buildOrderMetadata(
    SPONSORSHIP_ENTRIES,
    "cart-ref-sponsor"
  )

  it("the session metadata carries family=sponsorship", () => {
    expect(sponsorPlan.metadata.families).toBe("sponsorship")
  })

  it("one registration is counted", () => {
    expect(sponsorPlan.metadata.reg_count).toBe("1")
  })

  it("the summary names the business, then the two answers", () => {
    expect(sponsorPlan.metadata.reg_0).toBe(
      "Masters Sponsor x1: Acme Corp, Yes, cfo@acme.example"
    )
  })

  it("a mixed cart lists families in cart order", () => {
    expect(
      buildOrderMetadata(
        [...GOLF_ENTRIES, ...SPONSORSHIP_ENTRIES],
        "cart-ref-mixed"
      ).metadata.families
    ).toBe("golf,events,donation,sponsorship")
  })
})

describe("The metadata caps", () => {
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

  it("the session map stays within Stripe's 50-key limit", () => {
    expect(overflowKeys.length).toBeLessThanOrEqual(50)
  })

  it("the keys that no longer fit ride on their line items", () => {
    expect(Object.keys(overflow.lineMetadata).length).toBe(
      60 - (overflowKeys.length - 3)
    )
  })

  it("reg_count counts every registration", () => {
    expect(overflow.metadata.reg_count).toBe("60")
  })

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

  it("an over-long summary is capped at 500 characters", () => {
    expect(capped.length).toBeLessThanOrEqual(500)
  })

  it("the capped summary says how many it dropped", () => {
    expect(/… \+\d+ more$/.test(capped)).toBe(true)
  })

  it("the capped summary keeps its header", () => {
    expect(capped.startsWith("Golf Outing Registration x60: Registrant 0")).toBe(
      true
    )
  })
})
