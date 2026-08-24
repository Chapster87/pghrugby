import type Stripe from "stripe"

import { NextResponse } from "next/server"

import { recordOrder } from "@/lib/prototype-stripe/store"
import { stripe } from "@/lib/prototype-stripe/stripe"

/**
 * PROTOTYPE — Stripe webhook.
 *
 * POST /api/prototype/webhook
 * Signature-verified handler for checkout.session.completed. The order
 * recorded here is the source of truth; the return page's fast path calls the
 * same `recordOrder` and is idempotent with it.
 *
 * To test locally: `stripe listen --forward-to localhost:8000/api/prototype/webhook`
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
          "Missing stripe-signature header or STRIPE_WEBHOOK_SECRET. Run `stripe listen --forward-to localhost:8000/api/prototype/webhook`.",
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

  // Always ack; Stripe retries on non-2xx, and we don't want to retry events
  // we've deliberately ignored (research: handle async payment events later).
  return NextResponse.json({ received: true })
}
