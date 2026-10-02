import { describe, expect, it } from "vitest"

import { parseCartEntries, type CartEntry } from "@/lib/checkout/cart-entries"
import {
  addGroup,
  clampLineQuantity,
  deriveCartModel,
  isDonationSku,
  removeEntry,
  saveCollectorEntry,
  setEntryQuantity,
  type CartAddGroup,
  type IdFactory,
} from "@/lib/checkout/cart-mutations"

/**
 * The browser-held cart's rules (ticket #81) — the pure mutation and derivation
 * layer the store, the PDP, and the flyout all key off, plus the JSON round trip
 * through the boundary parser that `localStorage` and the checkout handoff do.
 *
 * Ported 1:1 from `scripts/cart-mutations-round-trip.ts` when the round-trip
 * scripts were replaced by the Vitest pure layer (#128). One `it` per original
 * `check`, named with its label, grouped by the original section headings.
 * Simple comparisons became `expect(actual).toBe(expected)` (or
 * `.not.toBe`/`.toBeUndefined`/`.toBeDefined`); compound conditions are asserted
 * verbatim. Assertions are carried over, not re-derived.
 *
 * Entirely offline — no Supabase, Stripe, or DatoCMS credentials.
 */

// --- fixtures ----------------------------------------------------------------

// --- the pure amount lookup the flyout passes in (injected, not imported) ---
// `cart-mutations` reads the catalog itself for the donation quantity rule
// (`isDonationSku`); amounts stay injected because the flyout resolves those
// through the pricing route, sale windows included.

const AMOUNTS: Record<string, number> = {
  "annual-forge-pig-roast": 2500,
  "steel-city-7s-bar-crawl": 500,
  "golf-outing-registration": 11000,
  "golf-outing-mulligan": 3000,
  "golf-outing-drink-band": 3000,
}

const amountFor = (sku: string) => AMOUNTS[sku] ?? 0

/** A deterministic id minter, so assertions can name the entries they expect. */
function idFactory(): IdFactory {
  let n = 0
  return (kind) => `${kind}-${++n}`
}

/** A pig-roast add: one quantity-bearing ticket, no collector, no add-ons. */
const pigRoast = (quantity: number): CartAddGroup => ({
  primaries: [
    { sku: "annual-forge-pig-roast", quantity, quantityBearing: true },
  ],
})

/** A golf add: a quantity-bearing registration plus its collector payload. */
const golf = (quantity: number, golfers: string[]): CartAddGroup => ({
  primaries: [
    { sku: "golf-outing-registration", quantity, quantityBearing: true },
  ],
  collector: {
    collectorRef: "golf-outing-collector",
    answers: { captain: "Jane Smith", golfers },
    fields: [
      { name: "captain", label: "Captain", type: "text", required: true },
      {
        name: "golfers",
        label: "Players",
        type: "text",
        repeatable: true,
        max: 3,
      },
    ],
  },
})

/** A donation-preset add: a plain line, never quantity-bearing. */
const donationPreset = (sku: string): CartAddGroup => ({
  primaries: [{ sku, quantity: 1, quantityBearing: false }],
})

// --- assertions --------------------------------------------------------------

describe("Plain lines merge by sku", () => {
  const ids = idFactory()
  let entries = addGroup([], pigRoast(2), {
    sourcePdp: "pig-roast",
    idFactory: ids,
  })
  entries = addGroup(entries, pigRoast(3), {
    sourcePdp: "pig-roast",
    idFactory: ids,
  })

  it("one line survives", () => {
    expect(entries.length).toBe(1)
  })

  it("quantities summed", () => {
    expect(entries[0]?.kind === "product" && entries[0].quantity === 5).toBe(
      true
    )
  })
})

describe("A donation merges by sku but is always quantity 1", () => {
  const ids = idFactory()
  const sku = "donation-club-preset-25"
  let entries = addGroup([], donationPreset(sku), {
    sourcePdp: "donate",
    idFactory: ids,
  })
  entries = addGroup(entries, donationPreset(sku), {
    sourcePdp: "donate",
    idFactory: ids,
  })

  const lines = entries.filter((entry) => entry.kind === "product")

  it("the two adds merge into one line", () => {
    expect(lines.length).toBe(1)
  })

  it("and it stays at Qty. 1 — the same gift, not a doubled one", () => {
    expect(lines[0]?.kind === "product" && lines[0].quantity === 1).toBe(true)
  })

  it("a donation sku is pinned on every write path", () => {
    expect(
      clampLineQuantity(5, sku) === 1 &&
        isDonationSku(sku) &&
        !isDonationSku("dues-fall")
    ).toBe(true)
  })

  it("a non-donation line still sums", () => {
    expect(clampLineQuantity(5, "dues-fall")).toBe(5)
  })
})

describe("A registration line never merges", () => {
  const ids = idFactory()
  let entries = addGroup([], golf(2, ["Mike Torres"]), {
    sourcePdp: "golf-outing",
    idFactory: ids,
  })
  entries = addGroup(entries, golf(1, ["Priya Nair"]), {
    sourcePdp: "golf-outing",
    idFactory: ids,
  })

  const lines = entries.filter((entry) => entry.kind === "product")
  const collectors = entries.filter((entry) => entry.kind === "collector")

  it("two primary lines", () => {
    expect(lines.length).toBe(2)
  })

  it("two collector entries", () => {
    expect(collectors.length).toBe(2)
  })

  it("each collector is parented to its own line", () => {
    expect(
      collectors.every(
        (collector) =>
          typeof collector.parentId === "string" &&
          lines.some((line) => line.id === collector.parentId)
      )
    ).toBe(true)
  })
})

describe("Add-ons merge under their primary", () => {
  const ids = idFactory()
  // A plain (collector-less) primary, so the add merges by sku and its add-on
  // is exercised on its own.
  const plain = (tickets: number, mulligans: number): CartAddGroup => ({
    primaries: [
      {
        sku: "golf-outing-registration",
        quantity: tickets,
        quantityBearing: true,
      },
    ],
    addons: [
      {
        sku: "golf-outing-mulligan",
        quantity: mulligans,
        quantityBearing: true,
      },
    ],
  })

  let entries = addGroup([], plain(1, 1), {
    sourcePdp: "golf-outing",
    idFactory: ids,
  })
  const primary = entries.find(
    (entry) => entry.kind === "product" && !entry.parentId
  )
  entries = addGroup(entries, plain(1, 2), {
    sourcePdp: "golf-outing",
    idFactory: ids,
  })

  const addons = entries.filter(
    (entry) => entry.kind === "product" && entry.parentId
  )

  it("the add-on merged, not appended", () => {
    expect(addons.length).toBe(1)
  })

  it("add-on quantities summed", () => {
    expect(addons[0]?.kind === "product" && addons[0].quantity === 3).toBe(true)
  })

  it("the primary merged too", () => {
    expect(entries.length).toBe(2)
  })

  it("add-on points at the surviving primary", () => {
    expect(addons[0]?.parentId).toBe(primary?.id)
  })
})

describe("A registration's add-on stays with its own line", () => {
  const ids = idFactory()
  const registered = (mulligans: number): CartAddGroup => ({
    ...golf(1, ["Mike Torres"]),
    addons: [
      {
        sku: "golf-outing-mulligan",
        quantity: mulligans,
        quantityBearing: true,
      },
    ],
  })

  let entries = addGroup([], registered(1), {
    sourcePdp: "golf-outing",
    idFactory: ids,
  })
  entries = addGroup(entries, registered(1), {
    sourcePdp: "golf-outing",
    idFactory: ids,
  })

  const addons = entries.filter(
    (entry) => entry.kind === "product" && entry.parentId
  )

  it("each registration keeps its own add-on", () => {
    expect(addons.length).toBe(2)
  })

  it("the add-ons hang off different primaries", () => {
    expect(addons[0]?.parentId).not.toBe(addons[1]?.parentId)
  })

  const primary = entries.find(
    (entry) => entry.kind === "product" && !entry.parentId
  )
  const afterRemove = removeEntry(entries, primary?.id ?? "")

  it("removing one primary cascades only its own children", () => {
    // The other registration keeps its own primary, add-on, and collector.
    expect(
      afterRemove.length === 3 &&
        afterRemove.every(
          (entry) => entry.parentId !== primary?.id && entry.id !== primary?.id
        )
    ).toBe(true)
  })
})

describe("Removing an add-on leaves the primary alone", () => {
  const ids = idFactory()
  let entries = addGroup(
    [],
    {
      ...pigRoast(1),
      addons: [
        { sku: "golf-outing-drink-band", quantity: 1, quantityBearing: true },
      ],
    },
    { sourcePdp: "pig-roast", idFactory: ids }
  )

  const addon = entries.find(
    (entry) => entry.kind === "product" && entry.parentId
  )
  entries = removeEntry(entries, addon?.id ?? "")
  const lines = entries.filter((entry) => entry.kind === "product")

  it("only the primary remains", () => {
    expect(lines.length).toBe(1)
  })

  it("the primary has no parent", () => {
    expect(lines[0]?.parentId).toBeUndefined()
  })
})

describe("Quantity floors at 1 and clamps at 100", () => {
  const ids = idFactory()
  const initial = addGroup([], pigRoast(1), {
    sourcePdp: "pig-roast",
    idFactory: ids,
  })
  const line = initial[0]

  // Each original `check` read the cart after one of two sequential writes, so
  // the intermediate states are snapshotted rather than overwritten.
  const floored = setEntryQuantity(initial, line?.id ?? "", 0)
  const clamped = setEntryQuantity(floored, line?.id ?? "", 10000)

  it("floor", () => {
    expect(floored[0]?.kind === "product" && floored[0].quantity === 1).toBe(
      true
    )
  })

  it("clamp", () => {
    expect(clamped[0]?.kind === "product" && clamped[0].quantity === 100).toBe(
      true
    )
  })
})

describe("`quantity_bearing` rides on the entry", () => {
  const ids = idFactory()
  const entries = addGroup(
    [],
    {
      primaries: [
        { sku: "annual-forge-pig-roast", quantity: 1, quantityBearing: true },
        {
          sku: "steel-city-7s-bar-crawl",
          quantity: 1,
          quantityBearing: false,
        },
      ],
    },
    { sourcePdp: "pig-roast", idFactory: ids }
  )
  const roast = entries.find(
    (entry) =>
      entry.kind === "product" && entry.sku === "annual-forge-pig-roast"
  )
  const crawl = entries.find(
    (entry) =>
      entry.kind === "product" && entry.sku === "steel-city-7s-bar-crawl"
  )

  it("a quantity-bearing line would show a stepper", () => {
    expect(roast?.kind === "product" && roast.quantityBearing === true).toBe(
      true
    )
  })

  it("a non-quantity-bearing line would show `Qty. 1`", () => {
    expect(crawl?.kind === "product" && crawl.quantityBearing === false).toBe(
      true
    )
  })
})

describe("Editing a registration writes answers and quantity together", () => {
  const ids = idFactory()
  let entries = addGroup([], golf(2, ["Mike Torres"]), {
    sourcePdp: "golf-outing",
    idFactory: ids,
  })
  const collector = entries.find((entry) => entry.kind === "collector")
  const primary = entries.find(
    (entry) => entry.kind === "product" && !entry.parentId
  )

  entries = saveCollectorEntry(
    entries,
    collector?.id ?? "",
    { captain: "Jane Smith", golfers: ["Mike Torres", "Priya Nair"] },
    3
  )

  const edited = entries.find((entry) => entry.kind === "collector")
  const line = entries.find(
    (entry) => entry.kind === "product" && !entry.parentId
  )

  it("answers replaced", () => {
    expect(
      edited?.kind === "collector" &&
        Array.isArray(edited.answers.golfers) &&
        edited.answers.golfers.length === 2
    ).toBe(true)
  })

  it("primary quantity follows", () => {
    expect(line?.kind === "product" && line.quantity === 3).toBe(true)
  })

  it("entry identity is stable", () => {
    expect(edited?.id).toBe(collector?.id)
  })

  it("cart order is stable", () => {
    expect(line?.id).toBe(primary?.id)
  })
})

// --- one cart, two PDPs, grouped display, and the derived readings --------
// Shared by the "two PDPs", "page reload", and "malformed entries" sections, as
// they were by the script's single `main()` scope.

const ids = idFactory()
let cart: CartEntry[] = []
cart = addGroup(cart, pigRoast(4), { sourcePdp: "pig-roast", idFactory: ids })
cart = addGroup(cart, golf(2, ["Mike Torres"]), {
  sourcePdp: "golf-outing",
  idFactory: ids,
})

const model = deriveCartModel(cart, amountFor)

describe("One cart holds lines from two PDPs", () => {
  it("two primaries on independent groups", () => {
    expect(model.primaries.length).toBe(2)
  })

  it("two display groups", () => {
    expect(model.groups.length).toBe(2)
  })

  it("groups carry the source PDP apart", () => {
    expect(model.groups[0]?.primaries[0]?.sourcePdp).not.toBe(
      model.groups[1]?.primaries[0]?.sourcePdp
    )
  })

  it("item count sums primary quantities", () => {
    expect(model.itemCount).toBe(6)
  })

  it("subtotal is the catalog total", () => {
    expect(model.subtotal).toBe(4 * 2500 + 2 * 11000)
  })

  it("the golf line reads as registration-backed", () => {
    expect(model.collectorFor(model.primaries[1]?.id ?? "")).toBeDefined()
  })
})

describe("The cart survives a page reload", () => {
  const reloaded = parseCartEntries(JSON.parse(JSON.stringify(cart)))

  it("entry count preserved", () => {
    expect(reloaded.length).toBe(cart.length)
  })

  it("entries deep-equal after the round trip", () => {
    expect(JSON.stringify(reloaded)).toBe(JSON.stringify(cart))
  })

  it("the derived model is unchanged after the round trip", () => {
    expect(deriveCartModel(reloaded, amountFor).subtotal).toBe(model.subtotal)
  })
})

describe("Malformed entries degrade to fewer lines, never a crash", () => {
  it("a garbage payload parses to nothing", () => {
    expect(parseCartEntries("not-an-array").length).toBe(0)
  })

  it("a collector without a parent is dropped", () => {
    expect(
      parseCartEntries([
        { id: "c1", kind: "collector", sourcePdp: "x", groupRef: "g" },
      ]).length
    ).toBe(0)
  })

  it("a priced line without a sku is dropped", () => {
    expect(
      parseCartEntries([
        { id: "p1", kind: "product", quantity: 1 },
        {
          id: "p2",
          kind: "product",
          sku: "annual-forge-pig-roast",
          quantity: 1,
        },
      ]).length
    ).toBe(1)
  })
})
