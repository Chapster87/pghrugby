import { NextResponse } from "next/server"

import {
  refusalResponse,
  resolveCartFromEntries,
  saveCart,
} from "@/lib/checkout/cart-store"
import { buildOrderMetadata } from "@/lib/checkout/order-metadata"
import {
  canUsePromotionCode,
  selectDiscount,
} from "@/lib/checkout/sc7s-discount"
import { isLiveStripe, stripe } from "@/lib/checkout/stripe"
import { getBaseURL } from "@/lib/util/env"

/**
 * POST /api/checkout/sessions  { cartRef, entries }
 *
 * The session build: re-resolves the browser-held cart against DatoCMS
 * **fresh** (so a sale window that closed, or a line that sold out, while the
 * cart sat open is caught at the payment boundary), writes the `carts` snapshot
 * `recordOrder` re-joins, and creates an embedded-page Checkout Session.
 *
 * Line items are the priced lines **in cart order** — collector entries never
 * become line items — each at its `effectivePriceId`. Live mode requires that
 * Price id. Test mode bills inline `price_data` instead, because a test key cannot
 * reference a live Price, but at the **same effective amount** the buyer was shown:
 * the amount comes from the line, not from the catalog's regular figure, so a
 * local rehearsal charges what production would.
 *
 * A sold-out or otherwise unquotable line answers `409` with `errors` and
 * blocks the session — never a silently dropped line, and never a whole-cart
 * refusal while other lines are valid.
 *
 * The session's single `discounts` slot is the SC7s additional-side discount
 * (`docs/agents/sc7s-additional-side-pricing.md`): the per-count coupon a
 * multi-team SC7s cart earns automatically, or the promotion code the buyer
 * entered on a one-team cart. A code is resolved against the live promotion codes
 * API only when it could apply, and one that cannot be honoured is a refusal — so
 * an irrelevant code can never block a cart, and a refused one writes no snapshot.
 *
 * `client_reference_id` = cartRef — the reconciliation key the webhook and the
 * success page use to re-join the cart's entry list, and the `reg_ref` the
 * order is traced back by.
 */

/**
 * Resolves a buyer-entered promotion code to its Stripe promotion code id.
 *
 * Stripe is the authority on a code's usability, but a session built with a
 * lapsed or fully-redeemed code fails there with an opaque error, so the two
 * conditions Stripe would refuse on are checked here and read as "no such code".
 * Codes are case-insensitive.
 *
 * @param code - The code as the buyer typed it.
 * @returns The promotion code id, or null when no active, redeemable code matches.
 */
async function resolvePromotionCodeId(code: string): Promise<string | null> {
  if (!stripe) return null

  const { data } = await stripe.promotionCodes.list({
    code,
    active: true,
    limit: 1,
  })
  const promotion = data[0]
  if (!promotion) return null

  if (promotion.expires_at && promotion.expires_at * 1000 <= Date.now()) {
    return null
  }
  if (
    promotion.max_redemptions != null &&
    promotion.times_redeemed >= promotion.max_redemptions
  ) {
    return null
  }
  return promotion.id
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    cartRef?: unknown
    entries?: unknown
    promotionCode?: unknown
  } | null

  if (!body || typeof body.cartRef !== "string" || !body.cartRef.trim()) {
    return NextResponse.json({ error: "cartRef is required" }, { status: 400 })
  }
  const cartRef = body.cartRef.trim()
  const promotionCode =
    typeof body.promotionCode === "string" ? body.promotionCode.trim() : ""

  if (!stripe) {
    return NextResponse.json(
      { error: "STRIPE_SECRET_KEY is not set — add it to .env.local" },
      { status: 500 }
    )
  }

  let cart
  try {
    cart = await resolveCartFromEntries({ cartRef, entries: body.entries })
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: message }, { status: 400 })
  }

  if (cart.errors.length > 0) {
    return NextResponse.json(refusalResponse(cart.errors), { status: 409 })
  }

  // A code is resolved only when it could actually be applied. The coupon it maps
  // to is restricted to the division products, so it needs exactly one SC7s team:
  // a cart that already qualifies takes the automatic coupon and ignores the
  // code, and one with no division line has nothing to discount. Resolving only
  // in that case is what stops an irrelevant or mistyped code refusing a session
  // it has no bearing on — and a refusal here precedes the snapshot write, so a
  // refused cart leaves no `carts` row.
  let promotionCodeId: string | null = null
  if (promotionCode && canUsePromotionCode(cart.entries)) {
    try {
      promotionCodeId = await resolvePromotionCodeId(promotionCode)
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error"
      return NextResponse.json(
        { error: `Could not check the promotion code: ${message}` },
        { status: 503 }
      )
    }
    if (!promotionCodeId) {
      return NextResponse.json(
        {
          error: `The promotion code “${promotionCode}” isn’t valid — remove it from the cart and try again.`,
        },
        { status: 400 }
      )
    }
  }

  // One discount, never a stack: the cart's automatic SC7s coupon wins over an
  // entered code, which is why Stripe's one-code-per-session limit is never hit.
  const discount = selectDiscount(cart.entries, promotionCodeId)

  // The snapshot rides beside the session, never in metadata: the session
  // carries the reference (client_reference_id) and the webhook re-joins it.
  // Written here rather than at validate time so it is the checkout-time cart.
  try {
    await saveCart(cart)
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json(
      { error: `Cart store unavailable: ${message}` },
      { status: 503 }
    )
  }

  const { metadata, lineMetadata } = buildOrderMetadata(
    cart.entries,
    cart.cartRef
  )

  try {
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded_page",
      mode: "payment",
      line_items: cart.lines.map((line, lineIndex) => {
        // Quote-time validation already refused an unpriced line in live mode;
        // this only narrows the type, and fails loudly rather than minting an
        // ad-hoc price in the live account.
        if (isLiveStripe && !line.priceId) {
          throw new Error(
            `No live Stripe Price id for sku "${line.sku}" — set the product's price in the CMS or fix catalog.ts`
          )
        }

        const overflow = lineMetadata[lineIndex]
        // A >50-line cart carries its tail summaries on the line items instead
        // of the session/PaymentIntent maps (spec § 8.5).
        const lineItemMetadata = overflow ? { metadata: overflow } : {}

        if (isLiveStripe) {
          return {
            price: line.priceId as string,
            quantity: line.quantity,
            ...lineItemMetadata,
          }
        }
        return {
          price_data: {
            currency: cart.currency,
            // The amount is the line's effective one — the sale amount while a
            // sale runs — so a test-mode charge matches the displayed price even
            // though the live Price itself cannot be referenced by a test key.
            // Stripe mints its own Product for a `price_data` line, and
            // `order_lines.family` / `orders.families` are read back off the
            // product's metadata — so the generated one has to be given the
            // family the live Product already carries, or every local order
            // records `{}` where production records the real family.
            product_data: {
              name: line.label,
              ...(line.family ? { metadata: { family: line.family } } : {}),
            },
            unit_amount: line.unitAmount,
          },
          quantity: line.quantity,
          ...lineItemMetadata,
        }
      }),
      // Required for embedded_page; Stripe substitutes {CHECKOUT_SESSION_ID}
      // on redirect. The origin comes from the same resolver the metadata does,
      // so a preview returns the buyer to that preview rather than to production.
      return_url: `${getBaseURL()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      client_reference_id: cart.cartRef,
      customer_creation: "always",
      ...(discount ? { discounts: [discount] } : {}),
      // `families` / `reg_N` / `reg_count` / `reg_ref` ride on both surfaces:
      // the Session object reaches our webhook, and the PaymentIntent is the
      // page the Dashboard shows for an individual payment.
      metadata,
      payment_intent_data: { metadata },
    })

    return NextResponse.json({ clientSecret: session.client_secret })
  } catch (error) {
    console.error("Checkout Session creation failed:", error)
    return NextResponse.json(
      { error: "Failed to create Checkout Session" },
      { status: 500 }
    )
  }
}
