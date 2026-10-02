import { describe, expect, it } from "vitest"

import { CHECKOUT_CATALOG, findCatalogItem } from "@/lib/checkout/catalog"
import {
  ANY_AMOUNT,
  ANY_AMOUNT_SKU,
  DONATION_FAMILY,
  anyAmountSessionParams,
  isDonationOnly,
  isDonationLine,
  sessionSubmitType,
  type FamilyBearingLine,
} from "@/lib/checkout/donations"

/**
 * Donation rules (ticket #87) — the session `submit_type` and the standalone
 * any-amount session in `@/lib/checkout/donations`, plus the preset ladder the
 * cart catalog carries.
 *
 * Ported 1:1 from `scripts/donations-round-trip.ts` when the round-trip scripts
 * were replaced by the Vitest pure layer (#128). One `it` per original `check`,
 * named with its label, grouped by the original section headings. Simple
 * comparisons became `expect(actual).toBe(expected)`; compound conditions are
 * asserted verbatim. Assertions are carried over, not re-derived.
 *
 * Entirely offline — no Stripe, DatoCMS or Supabase credentials.
 */

// --- fixtures ----------------------------------------------------------------

/** A quoted line, as far as the donation rules care: its family. */
const line = (family: string | null): FamilyBearingLine => ({ family })

/** The mixed cart the session build sees when a preset rides beside real goods. */
const MIXED = [line("dues"), line(DONATION_FAMILY)]

/** A donation-only session: two club presets. */
const DONATION_ONLY = [line(DONATION_FAMILY), line(DONATION_FAMILY)]

// --- assertions --------------------------------------------------------------

describe("The preset ladder is the three club rungs, ascending", () => {
  const ladder = CHECKOUT_CATALOG.donationPresets

  it("the rungs are ordered $10, $25, $50", () => {
    expect(
      ladder.map((item) => item.sku).join(",") ===
        "donation-club-preset-10,donation-club-preset-25,donation-club-preset-50"
    ).toBe(true)
  })

  it("the rungs are labelled with their amounts", () => {
    expect(
      findCatalogItem("donation-club-preset-10")?.label ===
        "Club donation — $10" &&
        findCatalogItem("donation-club-preset-25")?.label ===
          "Club donation — $25" &&
        findCatalogItem("donation-club-preset-50")?.label === "Club donation — $50"
    ).toBe(true)
  })

  it("every rung carries the donation family", () => {
    expect(ladder.every((item) => item.family === DONATION_FAMILY)).toBe(true)
  })

  it("the retired $1 placeholder is not a cart line", () => {
    expect(findCatalogItem("donation-pass-the-hat")).toBeUndefined()
  })
})

describe("A preset donation is a plain cart line", () => {
  const preset = findCatalogItem("donation-club-preset-25")

  it("the preset resolves to its own catalog item", () => {
    expect(Boolean(preset)).toBe(true)
  })

  it("it is priced like any line (no special-casing)", () => {
    expect(
      preset?.unitAmount === 2500 && preset?.family === DONATION_FAMILY
    ).toBe(true)
  })

  it("the any-amount record is never a cart line", () => {
    expect(findCatalogItem(ANY_AMOUNT_SKU)).toBeUndefined()
  })
})

describe("submit_type is donate only on a donation-only session", () => {
  it("a mixed session pays", () => {
    expect(sessionSubmitType(MIXED)).toBe("pay")
  })

  it("a real-product-only session pays", () => {
    expect(sessionSubmitType([line("golf")])).toBe("pay")
  })

  it("a donation-only session donates", () => {
    expect(sessionSubmitType(DONATION_ONLY)).toBe("donate")
  })

  it("an empty cart is never a donation session", () => {
    expect(sessionSubmitType([])).toBe("pay")
  })

  it("a family-less line is not a donation", () => {
    expect(
      !isDonationLine(line(null)) && !isDonationLine(line("events"))
    ).toBe(true)
  })

  it("one real line beside a donation is still not donation-only", () => {
    expect(!isDonationOnly(MIXED)).toBe(true)
  })
})

describe("The any-amount session is sole-line and cartless", () => {
  const params = anyAmountSessionParams({
    priceId: "price_any",
    returnUrl: "https://example.test/checkout/success",
  })

  it("it is a payment session", () => {
    expect(params.mode).toBe("payment")
  })

  it("it is embedded", () => {
    expect(params.ui_mode).toBe("embedded_page")
  })

  it("it reads as a donation", () => {
    expect(params.submit_type).toBe("donate")
  })

  it("it holds exactly one line item", () => {
    expect(
      Array.isArray(params.line_items) && params.line_items.length === 1
    ).toBe(true)
  })

  it("the line item is the given Price at quantity 1", () => {
    expect(
      params.line_items?.[0]?.price === "price_any" &&
        params.line_items?.[0]?.quantity === 1
    ).toBe(true)
  })

  it("it carries no discounts", () => {
    expect(params.discounts).toBeUndefined()
  })

  it("it is cartless — no client_reference_id", () => {
    expect(params.client_reference_id).toBeUndefined()
  })

  it("it returns the buyer to the given url", () => {
    expect(params.return_url).toBe("https://example.test/checkout/success")
  })

  it("it records the donation family on both metadata surfaces", () => {
    expect(
      params.metadata?.families === DONATION_FAMILY &&
        params.payment_intent_data?.metadata?.families === DONATION_FAMILY
    ).toBe(true)
  })

  it("it has no reg_ref, because a cartless order has no cartRef", () => {
    expect(params.metadata?.reg_ref).toBeUndefined()
  })

  it("it creates a customer, like the cart session", () => {
    expect(params.customer_creation).toBe("always")
  })
})

describe("The any-amount Price bounds", () => {
  it("the preset is $50", () => {
    expect(ANY_AMOUNT.preset).toBe(5000)
  })

  it("the minimum is $1", () => {
    expect(ANY_AMOUNT.minimum).toBe(100)
  })

  it("the maximum is $10,000", () => {
    expect(ANY_AMOUNT.maximum).toBe(1000000)
  })
})
