import { NextResponse } from "next/server"

import { findCatalogItem } from "@/lib/checkout/catalog"
import { getCart } from "@/lib/checkout/cart-store"
import { isLiveStripe, stripe } from "@/lib/checkout/stripe"
import { getBaseURL } from "@/lib/util/env"

/**
 * POST /api/checkout/sessions  { cartRef }
 *
 * Loads the server-authoritative cart and creates an embedded-page Checkout
 * Session. Returns { clientSecret } for the embedded Checkout UI. On
 * completion Stripe redirects to the return_url (the success page) with the
 * session id substituted.
 *
 * `client_reference_id` = cartRef — the reconciliation key the webhook and
 * success page use to re-join the registration payload.
 */

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const cartRef: string | undefined = body?.cartRef

  if (!cartRef || typeof cartRef !== "string") {
    return NextResponse.json({ error: "cartRef is required" }, { status: 400 })
  }

  if (!stripe) {
    return NextResponse.json(
      { error: "STRIPE_SECRET_KEY is not set — add it to .env.local" },
      { status: 500 }
    )
  }

  let cart
  try {
    cart = await getCart(cartRef)
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json(
      { error: `Cart store unavailable: ${message}` },
      { status: 503 }
    )
  }
  if (!cart) {
    return NextResponse.json(
      { error: "Cart not found — go back to the cart and build it again" },
      { status: 404 }
    )
  }

  try {
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded_page",
      mode: "payment",
      line_items: cart.items.map((item) => {
        const catalogItem = findCatalogItem(item.sku)
        // Live account (STRIPE_ENV=live): every line item must resolve to a
        // provisioned Stripe Price (see the catalog ticket + catalog.ts). Fail
        // loudly instead of falling back to inline price_data — a fallback
        // would silently mint an ad-hoc price in the live account. Test mode
        // uses inline price_data because a test key can't reference live
        // Prices; amounts are always server-side, never client-dictated.
        if (isLiveStripe) {
          if (!catalogItem?.priceId) {
            throw new Error(
              `No live Stripe Price id for sku "${item.sku}" — provision it via scripts/provision-stripe-catalog.mjs or fix catalog.ts`
            )
          }
          return { price: catalogItem.priceId, quantity: item.quantity }
        }
        return {
          price_data: {
            currency: cart.currency,
            product_data: { name: item.label },
            unit_amount: item.unitAmount,
          },
          quantity: item.quantity,
        }
      }),
      // Required for embedded_page; Stripe substitutes {CHECKOUT_SESSION_ID}
      // on redirect. The origin comes from the same resolver the metadata does,
      // so a preview returns the buyer to that preview rather than to production.
      return_url: `${getBaseURL()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      client_reference_id: cart.cartRef,
      customer_creation: "always",
      metadata: {
        flow: cart.flow,
      },
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
