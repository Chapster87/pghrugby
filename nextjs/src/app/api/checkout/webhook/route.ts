import type Stripe from "stripe"

import { NextResponse } from "next/server"

import { recordOrder } from "@/lib/checkout/record-order"
import { stripe } from "@/lib/checkout/stripe"

/**
 * POST /api/checkout/webhook
 *
 * Signature-verified Stripe webhook handler. The order recorded here is the
 * source of truth; the success page's fast path calls the same `recordOrder`
 * and is idempotent with it (first writer wins on session_id).
 *
 * To test locally: `stripe listen --forward-to localhost:8000/api/checkout/webhook`
 * and use the printed `whsec_...` as STRIPE_WEBHOOK_SECRET.
 */

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature")
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripe) {
    return NextResponse.json(
      { error: "STRIPE_SECRET_KEY is not set" },
      { status: 500 }
    )
  }

  if (!signature || !secret) {
    return NextResponse.json(
      {
        error:
          "Missing stripe-signature header or STRIPE_WEBHOOK_SECRET. Run `stripe listen --forward-to localhost:8000/api/checkout/webhook`.",
      },
      { status: 400 }
    )
  }

  const payload = await request.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret)
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    )
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    await recordOrder(session.id)
  }

  // Always ack; Stripe retries on non-2xx and we don't want to retry events
  // we've deliberately ignored (async payment / refund / expiry handling is
  // deferred edge-case work on the map).
  return NextResponse.json({ received: true })
}
