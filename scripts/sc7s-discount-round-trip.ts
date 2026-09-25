/**
 * Smoke check for the SC7s additional-side discount (ticket #86): the pure
 * selection in `src/lib/checkout/sc7s-discount.ts`, plus the retirement of the
 * two `sc7s-*-additional-side` catalog items.
 *
 * Everything asserted here is offline — no Stripe, DatoCMS or Supabase
 * credentials — because the selection takes the cart's entries as *given* and
 * derives the session's one discount from them. Resolving an entered promotion
 * code to an id (a Stripe read) and the charged amount are exercised by a real
 * checkout.
 *
 * It covers what the acceptance criteria turn on: a two-team cart discounted
 * automatically, the ladder's cap, a code accepted only on a one-team cart, the
 * one-discount rule (nothing stacks), and the retired items being gone from the
 * catalog.
 *
 *   node --import tsx scripts/sc7s-discount-round-trip.ts
 *   pnpm sc7s-discount:round-trip
 */

import type {
  CartEntry,
  CollectorEntry,
  PricedLine,
} from "../src/lib/checkout/cart-entries"
import { CHECKOUT_CATALOG, findCatalogItem } from "../src/lib/checkout/catalog"
import {
  SC7S_DIVISION_SKUS,
  SC7S_EXTRA_COUPON_IDS,
  SC7S_MAX_EXTRA_TEAMS,
  canUsePromotionCode,
  sc7sAutoCouponId,
  sc7sTeams,
  selectDiscount,
} from "../src/lib/checkout/sc7s-discount"

const PROMO_ID = "promo_EXTRASIDE"

// --- fixtures ----------------------------------------------------------------

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

/** The single discount's shape, for readable assertions. */
function shape(discount: ReturnType<typeof selectDiscount>): string {
  if (!discount) return "none"
  if ("coupon" in discount) return `coupon:${discount.coupon}`
  return `promotion_code:${discount.promotion_code}`
}

function main(): void {
  console.log("The retired additional-side items are gone from the catalog")
  check(
    "sc7s-mens-additional-side is no longer a catalog item",
    findCatalogItem("sc7s-mens-additional-side") === undefined
  )
  check(
    "sc7s-womens-additional-side is no longer a catalog item",
    findCatalogItem("sc7s-womens-additional-side") === undefined
  )
  check(
    "no catalog item is an additional side",
    !ALL_CATALOG_SKUS.some((sku) => sku.endsWith("-additional-side"))
  )
  check(
    "every division the coupon applies to is still in the catalog",
    SC7S_DIVISION_SKUS.every((sku) => findCatalogItem(sku) !== undefined)
  )

  console.log("\nA cart's SC7s teams are counted in units, not lines")
  check("no division line: no teams", sc7sTeams(NO_SC7S) === 0)
  check("one registration line: one team", sc7sTeams(ONE_TEAM) === 1)
  check("two registration lines: two teams", sc7sTeams(TWO_TEAMS) === 2)
  check(
    "one line of quantity 2: two teams",
    sc7sTeams(TWO_TEAMS_ONE_LINE) === 2
  )
  check("a collector entry is not a team of its own", sc7sTeams(ONE_TEAM) === 1)

  console.log("\nThe per-count coupon follows extras = teams − 1, capped")
  check(
    "one team earns nothing automatically",
    sc7sAutoCouponId(ONE_TEAM) === null
  )
  check("no teams earns nothing", sc7sAutoCouponId(NO_SC7S) === null)
  check(
    "two teams — the first extra — earn sc7s-extra-1",
    sc7sAutoCouponId(TWO_TEAMS) === "sc7s-extra-1"
  )
  check(
    "a second extra earns sc7s-extra-2",
    sc7sAutoCouponId([...TWO_TEAMS, line("l3", "sc7s-mens-social")]) ===
      "sc7s-extra-2"
  )
  check(
    "beyond the cap the largest rung applies",
    sc7sAutoCouponId(SIX_TEAMS) === SC7S_EXTRA_COUPON_IDS.at(-1)
  )
  check(
    "the ladder runs 1..N in extras order",
    SC7S_EXTRA_COUPON_IDS.length === SC7S_MAX_EXTRA_TEAMS &&
      SC7S_EXTRA_COUPON_IDS[0] === "sc7s-extra-1"
  )

  console.log("\nA qualifying cart is discounted automatically")
  check(
    "a two-team cart applies sc7s-extra-1",
    shape(selectDiscount(TWO_TEAMS)) === "coupon:sc7s-extra-1"
  )
  check(
    "gender-neutral: men's + women's counts as two teams",
    shape(selectDiscount(TWO_TEAMS)) === "coupon:sc7s-extra-1"
  )
  check(
    "a quantity-bearing two-team line qualifies too",
    shape(selectDiscount(TWO_TEAMS_ONE_LINE)) === "coupon:sc7s-extra-1"
  )

  console.log(
    "\nA code is accepted only when the cart does not already qualify"
  )
  check("a one-team cart can use a code", canUsePromotionCode(ONE_TEAM))
  check(
    "a qualifying cart cannot — the auto coupon wins instead",
    !canUsePromotionCode(TWO_TEAMS) && !canUsePromotionCode(TWO_TEAMS_ONE_LINE)
  )
  check("a cart with no SC7s team cannot", !canUsePromotionCode(NO_SC7S))
  check(
    "...and not on a cart with no SC7s team",
    selectDiscount(NO_SC7S, PROMO_ID) === null
  )
  check(
    "a one-team cart takes the entered promotion code",
    shape(selectDiscount(ONE_TEAM, PROMO_ID)) === `promotion_code:${PROMO_ID}`
  )
  check(
    "a one-team cart with no code takes nothing",
    selectDiscount(ONE_TEAM) === null
  )

  console.log("\nOnly one coupon or promotion code is ever applied")
  check(
    "an auto-qualified cart ignores an entered code",
    shape(selectDiscount(TWO_TEAMS, PROMO_ID)) === "coupon:sc7s-extra-1"
  )
  check(
    "the discount is one value, never a stack",
    [ONE_TEAM, TWO_TEAMS, NO_SC7S].every((entries) => {
      const discount = selectDiscount(entries, PROMO_ID)
      return discount === null || Object.keys(discount).length === 1
    })
  )

  if (failures > 0) {
    throw new Error(`${failures} sc7s discount assertion(s) failed`)
  }

  console.log("\nSC7s additional-side discount OK.")
}

try {
  main()
} catch (err) {
  console.error(`\n${err instanceof Error ? err.message : err}`)
  process.exitCode = 1
}
