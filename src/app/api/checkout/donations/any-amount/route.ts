import { NextResponse } from "next/server"

import { CHECKOUT_CURRENCY } from "@/lib/checkout/catalog"
import {
  ANY_AMOUNT,
  ANY_AMOUNT_SKU,
  anyAmountSessionParams,
  DONATION_FAMILY,
} from "@/lib/checkout/donations"
import { resolveProductRecords } from "@/lib/checkout/product-records"
import { isLiveStripe, stripe } from "@/lib/checkout/stripe"
import { getBaseURL } from "@/lib/util/env"

/**
 * POST /api/checkout/donations/any-amount
 *
 * The standalone pay-what-you-want session. It takes no body: the amount is
 * captured by Stripe itself, against a `custom_unit_amount` Price the buyer
 * edits in the embedded form.
 *
 * **Cartless by construction.** This route never reads, writes, or clears the
 * browser cart, and no `carts` snapshot is written — the session carries no
 * `client_reference_id`, so `recordOrder` records it as a cartless order. That is
 * what lets it proceed while the cart is non-empty: Stripe bars a
 * customer-entered amount from sharing a session with anything else, so this can
 * only ever be its own checkout (`docs/agents/donations-in-mixed-carts.md` § 3).
 *
 * The Price id is resolved from the `donation-club-any` DatoCMS record, keeping
 * price authority in the CMS (`docs/agents/pdp-pricing-and-sale-windows.md`). A
 * test key cannot reference a live Price, and inline `price_data` cannot express
 * a customer-entered amount, so test mode lazily mints the same Price in the test
 * account and reuses it by `lookup_key` — the local rehearsal shows a real amount
 * input, and no object is created twice.
 */

/** The test account's any-amount Price id, minted at most once per process. */
let testPriceId: string | null = null

/**
 * The any-amount Price id in the test account, minting it on first use.
 *
 * Idempotent by `lookup_key`: an existing Price is reused, and a create that
 * loses a race to a concurrent request re-reads the winner rather than failing.
 *
 * @returns The test account's `custom_unit_amount` Price id.
 * @throws When Stripe is unconfigured or the Price cannot be minted.
 */
async function resolveTestPriceId(): Promise<string> {
  if (testPriceId) return testPriceId
  if (!stripe) throw new Error("Stripe is not configured")

  const existing = await stripe.prices.list({
    lookup_keys: [ANY_AMOUNT_SKU],
    limit: 1,
  })
  if (existing.data[0]) {
    testPriceId = existing.data[0].id
    return testPriceId
  }

  try {
    const price = await stripe.prices.create({
      currency: CHECKOUT_CURRENCY,
      lookup_key: ANY_AMOUNT_SKU,
      product_data: {
        name: ANY_AMOUNT.label,
        metadata: { family: DONATION_FAMILY },
      },
      custom_unit_amount: {
        enabled: true,
        preset: ANY_AMOUNT.preset,
        minimum: ANY_AMOUNT.minimum,
        maximum: ANY_AMOUNT.maximum,
      },
    })
    testPriceId = price.id
    return testPriceId
  } catch (error) {
    const again = await stripe.prices.list({
      lookup_keys: [ANY_AMOUNT_SKU],
      limit: 1,
    })
    if (again.data[0]) {
      testPriceId = again.data[0].id
      return testPriceId
    }
    throw error
  }
}

export async function POST() {
  if (!stripe) {
    return NextResponse.json(
      { error: "STRIPE_SECRET_KEY is not set — add it to .env.local" },
      { status: 500 }
    )
  }

  // The CMS record is the any-amount offering: its `price_id` is the live
  // `custom_unit_amount` Price, and its `in_stock` is the switch that turns
  // any-amount giving off without a deploy.
  const records = await resolveProductRecords([ANY_AMOUNT_SKU])
  const record = records.get(ANY_AMOUNT_SKU)
  if (!record) {
    return NextResponse.json(
      {
        error: `Nothing in the CMS carries sku “${ANY_AMOUNT_SKU}” — author the any-amount product record first.`,
      },
      { status: 503 }
    )
  }
  if (!record.inStock) {
    return NextResponse.json(
      { error: "Any-amount giving is not available right now." },
      { status: 409 }
    )
  }

  try {
    let priceId: string
    if (isLiveStripe) {
      if (!record.priceId) {
        return NextResponse.json(
          {
            error:
              "The any-amount product has no price — set its Price id in the CMS.",
          },
          { status: 503 }
        )
      }
      priceId = record.priceId
    } else {
      priceId = await resolveTestPriceId()
    }

    const session = await stripe.checkout.sessions.create(
      anyAmountSessionParams({
        priceId,
        returnUrl: `${getBaseURL()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      })
    )

    return NextResponse.json({ clientSecret: session.client_secret })
  } catch (error) {
    console.error("Any-amount Checkout Session creation failed:", error)
    return NextResponse.json(
      { error: "Failed to create the donation's Checkout Session" },
      { status: 500 }
    )
  }
}
