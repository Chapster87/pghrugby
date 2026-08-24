import { NextResponse } from "next/server"

import { PROTOTYPE_BASE_URL, stripe } from "@/lib/prototype-stripe/stripe"
import { getCart } from "@/lib/prototype-stripe/store"

/**
 * PROTOTYPE — Checkout Session creation.
 *
 * POST /api/prototype/checkout-sessions  { cartRef }
 * Loads the server-authoritative cart, creates an embedded-page Checkout
 * Session, and returns { clientSecret }. The client mounts embedded Checkout
 * with that secret; on completion Stripe redirects to `return_url`.
 */

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const cartRef: string | undefined = body?.cartRef

  if (!cartRef) {
    return NextResponse.json({ error: "cartRef is required" }, { status: 400 })
  }

  const cart = getCart(cartRef)
  if (!cart) {
    return NextResponse.json(
      { error: "Cart not found (in-memory store was probably reset)" },
      { status: 404 }
    )
  }

  if (!stripe) {
    return NextResponse.json(
      { error: "STRIPE_SECRET_KEY is not set — add it to .env.local" },
      { status: 500 }
    )
  }

  try {
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded_page",
      mode: "payment",
      line_items: cart.items.map((item) => ({
        price_data: {
          currency: cart.currency,
          product_data: { name: item.label },
          unit_amount: item.unitAmount,
        },
        quantity: item.quantity,
      })),
      // Required for embedded_page; the {CHECKOUT_SESSION_ID} template is
      // substituted by Stripe on redirect.
      return_url: `${PROTOTYPE_BASE_URL}/prototype/return?session_id={CHECKOUT_SESSION_ID}`,
      // The reconciliation key — cartRef doubles as it so the webhook can
      // re-join the registration payload.
      client_reference_id: cart.cartRef,
      metadata: {
        flow: cart.flow,
        source: "wayfinder-prototype",
      },
      customer_creation: "always",
      // 30-minute expiry for abandoned carts (research flagged expires_at as
      // a real decision; the spike just picks something short).
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
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
