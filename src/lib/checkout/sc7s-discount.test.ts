import { describe, expect, it } from "vitest"

import type {
  CartEntry,
  CollectorEntry,
  PricedLine,
} from "@/lib/checkout/cart-entries"
import { CHECKOUT_CATALOG, findCatalogItem } from "@/lib/checkout/catalog"
import {
  SC7S_DIVISION_SKUS,
  SC7S_EXTRA_COUPON_IDS,
  SC7S_MAX_EXTRA_TEAMS,
  canUsePromotionCode,
  sc7sAutoCouponId,
  sc7sDiscountPerLine,
  sc7sTeams,
  selectDiscount,
} from "@/lib/checkout/sc7s-discount"

/**
 * The SC7s additional-side discount (ticket #86) — the pure selection in
 * `@/lib/checkout/sc7s-discount`, plus the retirement of the two
 * `sc7s-*-additional-side` catalog items.
 *
 * Ported 1:1 from `scripts/sc7s-discount-round-trip.ts` when the round-trip
 * scripts were replaced by the Vitest pure layer (#128). One `it` per original
 * `check`, named with its label, grouped by the original section headings.
 * Simple comparisons became `expect(actual).toBe(expected)`; compound conditions
 * are asserted verbatim. Assertions are carried over, not re-derived.
 *
 * Everything asserted here is offline — no Stripe, DatoCMS or Supabase
 * credentials — because the selection takes the cart's entries as *given* and
 * derives the session's one discount from them.
 */

// --- fixtures ----------------------------------------------------------------

const PROMO_ID = "promo_EXTRASIDE"

function line(id: string, sku: string, quantity = 1): PricedLine {
  return {
    id,
    kind: "product",
    sku,
    quantity,
    sourcePdp: "steel-city-7s",
    groupRef: "group-1",
  }
}

/** A division line's registration payload — one team's answers. */
function collector(id: string, parentId: string): CollectorEntry {
  return {
    id,
    kind: "collector",
    collectorRef: "sc7s-team",
    answers: { teamName: "Forge A" },
    fields: [{ name: "teamName", label: "Team name", type: "text" }],
    sourcePdp: "steel-city-7s",
    groupRef: "group-1",
    parentId,
  }
}

const ONE_TEAM: CartEntry[] = [
  line("line-men", "sc7s-mens-open"),
  collector("collector-men", "line-men"),
]
/** Two adds of two divisions — the gender-neutral "2 teams is 2 teams" case. */
const TWO_TEAMS: CartEntry[] = [
  ...ONE_TEAM,
  line("line-women", "sc7s-womens-social"),
  collector("collector-women", "line-women"),
]
/** One quantity-bearing division line carrying two teams. */
const TWO_TEAMS_ONE_LINE: CartEntry[] = [
  line("line-men", "sc7s-mens-open", 2),
  collector("collector-men", "line-men"),
]
const SIX_TEAMS: CartEntry[] = Array.from({ length: 6 }, (_, index) =>
  line(`line-${index}`, "sc7s-mens-open")
)
/** Paid lines with no SC7s team at all. */
const NO_SC7S: CartEntry[] = [
  line("line-golf", "golf-outing-registration"),
  line("line-pig-roast", "annual-forge-pig-roast"),
]

const ALL_CATALOG_SKUS = [
  ...Object.values(CHECKOUT_CATALOG.dues),
  ...Object.values(CHECKOUT_CATALOG.golf),
  ...CHECKOUT_CATALOG.tournament.divisions,
  ...CHECKOUT_CATALOG.donationPresets,
  ...CHECKOUT_CATALOG.events,
].map((item) => item.sku)

/** The single discount's shape, for readable assertions. */
function shape(discount: ReturnType<typeof selectDiscount>): string {
  if (!discount) return "none"
  if ("coupon" in discount) return `coupon:${discount.coupon}`
  return `promotion_code:${discount.promotion_code}`
}

// --- assertions --------------------------------------------------------------

describe("The retired additional-side items are gone from the catalog", () => {
  it("sc7s-mens-additional-side is no longer a catalog item", () => {
    expect(findCatalogItem("sc7s-mens-additional-side")).toBeUndefined()
  })

  it("sc7s-womens-additional-side is no longer a catalog item", () => {
    expect(findCatalogItem("sc7s-womens-additional-side")).toBeUndefined()
  })

  it("no catalog item is an additional side", () => {
    expect(
      !ALL_CATALOG_SKUS.some((sku) => sku.endsWith("-additional-side"))
    ).toBe(true)
  })

  it("every division the coupon applies to is still in the catalog", () => {
    expect(
      SC7S_DIVISION_SKUS.every((sku) => findCatalogItem(sku) !== undefined)
    ).toBe(true)
  })
})

describe("A cart's SC7s teams are counted in units, not lines", () => {
  it("no division line: no teams", () => {
    expect(sc7sTeams(NO_SC7S)).toBe(0)
  })

  it("one registration line: one team", () => {
    expect(sc7sTeams(ONE_TEAM)).toBe(1)
  })

  it("two registration lines: two teams", () => {
    expect(sc7sTeams(TWO_TEAMS)).toBe(2)
  })

  it("one line of quantity 2: two teams", () => {
    expect(sc7sTeams(TWO_TEAMS_ONE_LINE)).toBe(2)
  })

  it("a collector entry is not a team of its own", () => {
    expect(sc7sTeams(ONE_TEAM)).toBe(1)
  })
})

describe("The per-count coupon follows extras = teams − 1, capped", () => {
  it("one team earns nothing automatically", () => {
    expect(sc7sAutoCouponId(ONE_TEAM)).toBeNull()
  })

  it("no teams earns nothing", () => {
    expect(sc7sAutoCouponId(NO_SC7S)).toBeNull()
  })

  it("two teams — the first extra — earn sc7s-extra-1", () => {
    expect(sc7sAutoCouponId(TWO_TEAMS)).toBe("sc7s-extra-1")
  })

  it("a second extra earns sc7s-extra-2", () => {
    expect(
      sc7sAutoCouponId([...TWO_TEAMS, line("l3", "sc7s-mens-social")])
    ).toBe("sc7s-extra-2")
  })

  it("beyond the cap the largest rung applies", () => {
    expect(sc7sAutoCouponId(SIX_TEAMS)).toBe(SC7S_EXTRA_COUPON_IDS.at(-1))
  })

  it("the ladder runs 1..N in extras order", () => {
    expect(
      SC7S_EXTRA_COUPON_IDS.length === SC7S_MAX_EXTRA_TEAMS &&
        SC7S_EXTRA_COUPON_IDS[0] === "sc7s-extra-1"
    ).toBe(true)
  })
})

describe("A qualifying cart is discounted automatically", () => {
  it("a two-team cart applies sc7s-extra-1", () => {
    expect(shape(selectDiscount(TWO_TEAMS))).toBe("coupon:sc7s-extra-1")
  })

  it("gender-neutral: men's + women's counts as two teams", () => {
    expect(shape(selectDiscount(TWO_TEAMS))).toBe("coupon:sc7s-extra-1")
  })

  it("a quantity-bearing two-team line qualifies too", () => {
    expect(shape(selectDiscount(TWO_TEAMS_ONE_LINE))).toBe(
      "coupon:sc7s-extra-1"
    )
  })
})

describe("A code is accepted only when the cart does not already qualify", () => {
  it("a one-team cart can use a code", () => {
    expect(canUsePromotionCode(ONE_TEAM)).toBe(true)
  })

  it("a qualifying cart cannot — the auto coupon wins instead", () => {
    expect(
      !canUsePromotionCode(TWO_TEAMS) &&
        !canUsePromotionCode(TWO_TEAMS_ONE_LINE)
    ).toBe(true)
  })

  it("a cart with no SC7s team cannot", () => {
    expect(!canUsePromotionCode(NO_SC7S)).toBe(true)
  })

  it("...and not on a cart with no SC7s team", () => {
    expect(selectDiscount(NO_SC7S, PROMO_ID)).toBeNull()
  })

  it("a one-team cart takes the entered promotion code", () => {
    expect(shape(selectDiscount(ONE_TEAM, PROMO_ID))).toBe(
      `promotion_code:${PROMO_ID}`
    )
  })

  it("a one-team cart with no code takes nothing", () => {
    expect(selectDiscount(ONE_TEAM)).toBeNull()
  })
})

describe("Only one coupon or promotion code is ever applied", () => {
  it("an auto-qualified cart ignores an entered code", () => {
    expect(shape(selectDiscount(TWO_TEAMS, PROMO_ID))).toBe(
      "coupon:sc7s-extra-1"
    )
  })

  it("the discount is one value, never a stack", () => {
    expect(
      [ONE_TEAM, TWO_TEAMS, NO_SC7S].every((entries) => {
        const discount = selectDiscount(entries, PROMO_ID)
        return discount === null || Object.keys(discount).length === 1
      })
    ).toBe(true)
  })
})

describe("A resolved discount splits back across the lines it lowers", () => {
  const THREE_TEAMS: CartEntry[] = [
    ...TWO_TEAMS,
    line("line-social", "sc7s-mens-social"),
  ]

  it("no SC7s line: nothing attributed", () => {
    expect(sc7sDiscountPerLine(NO_SC7S, 2500)).toEqual({})
  })

  it("a non-positive amount: nothing attributed", () => {
    expect(sc7sDiscountPerLine(TWO_TEAMS, 0)).toEqual({})
  })

  it("a one-team cart (the code case) carries the whole amount", () => {
    expect(sc7sDiscountPerLine(ONE_TEAM, 2500)).toEqual({ "line-men": 2500 })
  })

  it("the first team is full price; the second carries the discount", () => {
    expect(sc7sDiscountPerLine(TWO_TEAMS, 2500)).toEqual({
      "line-women": 2500,
    })
  })

  it("a quantity-bearing line attributes to its one entry", () => {
    expect(sc7sDiscountPerLine(TWO_TEAMS_ONE_LINE, 2500)).toEqual({
      "line-men": 2500,
    })
  })

  it("three teams split the discount across the two extras", () => {
    expect(sc7sDiscountPerLine(THREE_TEAMS, 5000)).toEqual({
      "line-women": 2500,
      "line-social": 2500,
    })
  })

  it("the attributed parts always sum to the amount", () => {
    for (const [entries, amount] of [
      [ONE_TEAM, 2500],
      [TWO_TEAMS, 2500],
      [THREE_TEAMS, 5000],
      [SIX_TEAMS, 12500],
    ] as [CartEntry[], number][]) {
      const perLine = sc7sDiscountPerLine(entries, amount)
      const sum = Object.values(perLine).reduce((total, v) => total + v, 0)
      expect(sum).toBe(amount)
    }
  })
})
