/**
 * Smoke check for the donation rules (ticket #87): the session `submit_type`
 * and the standalone any-amount session in `src/lib/checkout/donations.ts`,
 * plus the preset ladder the cart catalog carries.
 *
 * Everything asserted here is offline — no Stripe, DatoCMS or Supabase
 * credentials — because the donation rules are pure: they take the session's
 * quoted lines and the any-amount Price id as *given*. The DatoCMS read that
 * resolves the sku, the lazy test-mode Price mint, and the session create
 * itself are exercised by a real checkout.
 *
 * It covers what the acceptance criteria turn on: a preset rides a mixed cart as
 * a plain line, the ladder is the three club rungs in ascending order with the
 * right labels, `submit_type` is `'donate'` only on a donation-only session, and
 * the any-amount session is sole-line, quantity 1, no discounts.
 *
 * The `donation-pass-the-hat` $1 product is asserted **absent**: it was a
 * placeholder, never a ladder rung.
 *
 *   node --import tsx scripts/donations-round-trip.ts
 *   pnpm donations:round-trip
 */

import { CHECKOUT_CATALOG, findCatalogItem } from "../src/lib/checkout/catalog"
import {
  ANY_AMOUNT,
  ANY_AMOUNT_SKU,
  DONATION_FAMILY,
  anyAmountSessionParams,
  isDonationOnly,
  isDonationLine,
  sessionSubmitType,
  type FamilyBearingLine,
} from "../src/lib/checkout/donations"

// --- fixtures ----------------------------------------------------------------

/** A quoted line, as far as the donation rules care: its family. */
const line = (family: string | null): FamilyBearingLine => ({ family })

/** The mixed cart the session build sees when a preset rides beside real goods. */
const MIXED = [line("dues"), line(DONATION_FAMILY)]

/** A donation-only session: two club presets. */
const DONATION_ONLY = [line(DONATION_FAMILY), line(DONATION_FAMILY)]

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

function main(): void {
  console.log("The preset ladder is the three club rungs, ascending")
  const ladder = CHECKOUT_CATALOG.donationPresets
  check(
    "the rungs are ordered $10, $25, $50",
    ladder.map((item) => item.sku).join(",") ===
      "donation-club-preset-10,donation-club-preset-25,donation-club-preset-50"
  )
  check(
    "the rungs are labelled with their amounts",
    findCatalogItem("donation-club-preset-10")?.label ===
      "Club donation — $10" &&
      findCatalogItem("donation-club-preset-25")?.label ===
        "Club donation — $25" &&
      findCatalogItem("donation-club-preset-50")?.label ===
        "Club donation — $50"
  )
  check(
    "every rung carries the donation family",
    ladder.every((item) => item.family === DONATION_FAMILY)
  )
  check(
    "the retired $1 placeholder is not a cart line",
    findCatalogItem("donation-pass-the-hat") === undefined
  )

  console.log("\nA preset donation is a plain cart line")
  const preset = findCatalogItem("donation-club-preset-25")
  check("the preset resolves to its own catalog item", Boolean(preset))
  check(
    "it is priced like any line (no special-casing)",
    preset?.unitAmount === 2500 && preset?.family === DONATION_FAMILY
  )
  const anyAmount = findCatalogItem(ANY_AMOUNT_SKU)
  check("the any-amount record is never a cart line", anyAmount === undefined)

  console.log("\nsubmit_type is donate only on a donation-only session")
  check("a mixed session pays", sessionSubmitType(MIXED) === "pay")
  check(
    "a real-product-only session pays",
    sessionSubmitType([line("golf")]) === "pay"
  )
  check(
    "a donation-only session donates",
    sessionSubmitType(DONATION_ONLY) === "donate"
  )
  check(
    "an empty cart is never a donation session",
    sessionSubmitType([]) === "pay"
  )
  check(
    "a family-less line is not a donation",
    !isDonationLine(line(null)) && !isDonationLine(line("events"))
  )
  check(
    "one real line beside a donation is still not donation-only",
    !isDonationOnly(MIXED)
  )

  console.log("\nThe any-amount session is sole-line and cartless")
  const params = anyAmountSessionParams({
    priceId: "price_any",
    returnUrl: "https://example.test/checkout/success",
  })
  check("it is a payment session", params.mode === "payment")
  check("it is embedded", params.ui_mode === "embedded_page")
  check("it reads as a donation", params.submit_type === "donate")
  check(
    "it holds exactly one line item",
    Array.isArray(params.line_items) && params.line_items.length === 1
  )
  check(
    "the line item is the given Price at quantity 1",
    params.line_items?.[0]?.price === "price_any" &&
      params.line_items?.[0]?.quantity === 1
  )
  check("it carries no discounts", params.discounts === undefined)
  check(
    "it is cartless — no client_reference_id",
    params.client_reference_id === undefined
  )
  check(
    "it returns the buyer to the given url",
    params.return_url === "https://example.test/checkout/success"
  )
  check(
    "it records the donation family on both metadata surfaces",
    params.metadata?.families === DONATION_FAMILY &&
      params.payment_intent_data?.metadata?.families === DONATION_FAMILY
  )
  check(
    "it has no reg_ref, because a cartless order has no cartRef",
    params.metadata?.reg_ref === undefined
  )
  check(
    "it creates a customer, like the cart session",
    params.customer_creation === "always"
  )

  console.log("\nThe any-amount Price bounds")
  check("the preset is $50", ANY_AMOUNT.preset === 5000)
  check("the minimum is $1", ANY_AMOUNT.minimum === 100)
  check("the maximum is $10,000", ANY_AMOUNT.maximum === 1000000)

  if (failures > 0) {
    throw new Error(`${failures} donation assertion(s) failed`)
  }

  console.log("\nDonations OK.")
}

try {
  main()
} catch (err) {
  console.error(`\n${err instanceof Error ? err.message : err}`)
  process.exitCode = 1
}
