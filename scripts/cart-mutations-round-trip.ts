/**
 * Smoke check for the browser-held cart's rules (ticket #81).
 *
 * Exercises the **pure** mutation and derivation layer the store, the PDP, and
 * the flyout all key off — `src/lib/checkout/cart-mutations.ts` — against the
 * settled cart-line model (`docs/agents/cart-line-model.md`): merge keys,
 * cascade removal, `quantity → rows` edits, grouped display, and the
 * `quantity_bearing` read the flyout renders `Qty. N` from.
 *
 * Entirely offline — no Supabase, Stripe, or DatoCMS credentials — and it
 * finishes by round-tripping the cart through JSON and the boundary parser, the
 * way `localStorage` and the checkout handoff do, so "add to cart survives a
 * page reload" is asserted rather than assumed.
 *
 *   node --import tsx scripts/cart-mutations-round-trip.ts
 *   pnpm cart:round-trip
 */

import {
  parseCartEntries,
  type CartEntry,
} from "../src/lib/checkout/cart-entries"
import {
  addGroup,
  deriveCartModel,
  removeEntry,
  saveCollectorEntry,
  setEntryQuantity,
  type CartAddGroup,
  type IdFactory,
} from "../src/lib/checkout/cart-mutations"

// --- the pure amount lookup the flyout passes in (injected, not imported, so
//     the check never pulls the catalog's Stripe Price ids into a test run) ---

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

function main(): void {
  console.log("Cart mutations round-trip")

  // --- merge by sku: a plain line sums; a registration line never merges -----

  {
    console.log("\nPlain lines merge by sku")
    const ids = idFactory()
    let entries = addGroup([], pigRoast(2), {
      sourcePdp: "pig-roast",
      idFactory: ids,
    })
    entries = addGroup(entries, pigRoast(3), {
      sourcePdp: "pig-roast",
      idFactory: ids,
    })

    check("one line survives", entries.length === 1)
    check(
      "quantities summed",
      entries[0]?.kind === "product" && entries[0].quantity === 5
    )
  }

  {
    console.log("\nA registration line never merges")
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
    check("two primary lines", lines.length === 2)
    check("two collector entries", collectors.length === 2)
    check(
      "each collector is parented to its own line",
      collectors.every(
        (collector) =>
          typeof collector.parentId === "string" &&
          lines.some((line) => line.id === collector.parentId)
      )
    )
  }

  // --- add-ons merge on (sku, parentId) and cascade with their primary -------

  {
    console.log("\nAdd-ons merge under their primary")
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
    check("the add-on merged, not appended", addons.length === 1)
    check(
      "add-on quantities summed",
      addons[0]?.kind === "product" && addons[0].quantity === 3
    )
    check("the primary merged too", entries.length === 2)
    check(
      "add-on points at the surviving primary",
      addons[0]?.parentId === primary?.id
    )
  }

  {
    console.log("\nA registration's add-on stays with its own line")
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
    check("each registration keeps its own add-on", addons.length === 2)
    check(
      "the add-ons hang off different primaries",
      addons[0]?.parentId !== addons[1]?.parentId
    )

    const primary = entries.find(
      (entry) => entry.kind === "product" && !entry.parentId
    )
    const afterRemove = removeEntry(entries, primary?.id ?? "")
    check(
      "removing one primary cascades only its own children",
      // The other registration keeps its own primary, add-on, and collector.
      afterRemove.length === 3 &&
        afterRemove.every(
          (entry) => entry.parentId !== primary?.id && entry.id !== primary?.id
        )
    )
  }

  {
    console.log("\nRemoving an add-on leaves the primary alone")
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
    check("only the primary remains", lines.length === 1)
    check("the primary has no parent", lines[0]?.parentId === undefined)
  }

  // --- quantity floors, clamps, and the locked-reading flag ------------------

  {
    console.log("\nQuantity floors at 1 and clamps at 100")
    const ids = idFactory()
    let entries = addGroup([], pigRoast(1), {
      sourcePdp: "pig-roast",
      idFactory: ids,
    })
    const line = entries[0]

    entries = setEntryQuantity(entries, line?.id ?? "", 0)
    check("floor", entries[0]?.kind === "product" && entries[0].quantity === 1)

    entries = setEntryQuantity(entries, line?.id ?? "", 10000)
    check(
      "clamp",
      entries[0]?.kind === "product" && entries[0].quantity === 100
    )
  }

  {
    console.log("\n`quantity_bearing` rides on the entry")
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
    check(
      "a quantity-bearing line would show a stepper",
      roast?.kind === "product" && roast.quantityBearing === true
    )
    check(
      "a non-quantity-bearing line would show `Qty. 1`",
      crawl?.kind === "product" && crawl.quantityBearing === false
    )
  }

  // --- editing a registration writes both halves together -------------------

  {
    console.log("\nEditing a registration writes answers and quantity together")
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
    check(
      "answers replaced",
      edited?.kind === "collector" &&
        Array.isArray(edited.answers.golfers) &&
        edited.answers.golfers.length === 2
    )
    check(
      "primary quantity follows",
      line?.kind === "product" && line.quantity === 3
    )
    check("entry identity is stable", edited?.id === collector?.id)
    check("cart order is stable", line?.id === primary?.id)
  }

  // --- one cart, two PDPs, grouped display, and the derived readings --------

  console.log("\nOne cart holds lines from two PDPs")
  const ids = idFactory()
  let cart: CartEntry[] = []
  cart = addGroup(cart, pigRoast(4), { sourcePdp: "pig-roast", idFactory: ids })
  cart = addGroup(cart, golf(2, ["Mike Torres"]), {
    sourcePdp: "golf-outing",
    idFactory: ids,
  })

  const model = deriveCartModel(cart, amountFor)

  check("two primaries on independent groups", model.primaries.length === 2)
  check("two display groups", model.groups.length === 2)
  check(
    "groups carry the source PDP apart",
    model.groups[0]?.primaries[0]?.sourcePdp !==
      model.groups[1]?.primaries[0]?.sourcePdp
  )
  check("item count sums primary quantities", model.itemCount === 6)
  check(
    "subtotal is the catalog total",
    model.subtotal === 4 * 2500 + 2 * 11000
  )
  check(
    "the golf line reads as registration-backed",
    model.collectorFor(model.primaries[1]?.id ?? "") !== undefined
  )

  // --- survives a reload: the store's write is JSON + the boundary parser ---

  console.log("\nThe cart survives a page reload")
  const reloaded = parseCartEntries(JSON.parse(JSON.stringify(cart)))
  check("entry count preserved", reloaded.length === cart.length)
  check(
    "entries deep-equal after the round trip",
    JSON.stringify(reloaded) === JSON.stringify(cart)
  )
  check(
    "the derived model is unchanged after the round trip",
    deriveCartModel(reloaded, amountFor).subtotal === model.subtotal
  )

  console.log("\nMalformed entries degrade to fewer lines, never a crash")
  check(
    "a garbage payload parses to nothing",
    parseCartEntries("not-an-array").length === 0
  )
  check(
    "a collector without a parent is dropped",
    parseCartEntries([
      { id: "c1", kind: "collector", sourcePdp: "x", groupRef: "g" },
    ]).length === 0
  )
  check(
    "a priced line without a sku is dropped",
    parseCartEntries([
      { id: "p1", kind: "product", quantity: 1 },
      { id: "p2", kind: "product", sku: "annual-forge-pig-roast", quantity: 1 },
    ]).length === 1
  )

  if (failures > 0) {
    throw new Error(`${failures} cart assertion(s) failed`)
  }

  console.log("\nCart rules OK.")
}

try {
  main()
} catch (err) {
  console.error(`\n${err instanceof Error ? err.message : err}`)
  process.exitCode = 1
}
