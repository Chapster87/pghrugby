import type Stripe from "stripe"

import { NextResponse } from "next/server"

import {
  applyChargeRefund,
  recordOrder,
  updateOrderPaymentStatus,
} from "@/lib/checkout/record-order"
import { stripe } from "@/lib/checkout/stripe"

/**
 * POST /api/checkout/webhook
 *
 * Signature-verified Stripe webhook handler. The order recorded here is the
 * source of truth; the success page's fast path calls the same `recordOrder`
 * and is idempotent with it (first writer wins on session_id).
 *
 * Event map (locked by the Stripe edge-cases prototype):
 *   - checkout.session.completed           → recordOrder (insert ... on
 *                                            conflict do nothing; freezes
 *                                            identity/amounts at first write)
 *   - checkout.session.async_payment_succeeded / _failed → DO UPDATE
 *                                            `payment_status` → paid / unpaid
 *   - checkout.session.expired             → ack, no row (drop policy)
 *   - charge.refunded                      → DO UPDATE `refunded_amount` +
 *                                            `refund_status` by
 *                                            `payment_intent_id` (aggregate
 *                                            only; no refund.* subscriptions)
 *
 * Every status transition is a targeted PostgREST PATCH of the mutable status
 * columns only — never `resolution=merge-duplicates`, which would clobber the
 * frozen first-write columns.
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

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      await recordOrder(session.id)
      break
    }

    case "checkout.session.async_payment_succeeded":
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session
      const paymentStatus =
        session.payment_status ??
        (event.type === "checkout.session.async_payment_succeeded"
          ? "paid"
          : "unpaid")
      let updated = await updateOrderPaymentStatus(session.id, paymentStatus)
      if (!updated) {
        // Defensive: the completed event should have landed first. Fall back to
        // recordOrder (its DO NOTHING insert repairs the missing row with the
        // session's current payment_status), then apply the transition.
        await recordOrder(session.id)
        await updateOrderPaymentStatus(session.id, paymentStatus)
      }
      break
    }

    case "checkout.session.expired": {
      // Drop policy (locked): expired sessions are acked, never recorded; the
      // collected_information is dropped with the event. The return page's
      // onlyWhenComplete guard likewise refuses to insert a row for one.
      break
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge
      const applied = await applyChargeRefund(charge)
      if (!applied) {
        // Anomaly: refunds presuppose a completed payment, so the row should
        // exist. There is no PaymentIntent → Checkout Session reverse link to
        // recover from, so this alerts instead of silently acking.
        console.error(
          `[webhook] ALERT: charge.refunded for unknown payment_intent ${
            charge.payment_intent ?? "(none)"
          } — no orders row carries it; reconcile manually (no PaymentIntent → Checkout Session reverse link)`
        )
      }
      break
    }
  }

  // Always ack; Stripe retries on non-2xx and we don't want to retry events
  // we've deliberately ignored (expired sessions, missing-row anomalies).
  return NextResponse.json({ received: true })
}
