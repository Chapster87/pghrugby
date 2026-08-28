"use client"

import { Suspense, useCallback } from "react"

import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import s from "./styles.module.css"

/**
 * Embedded Checkout page — mounts Stripe's full-page embedded Checkout via the
 * React provider (`@stripe/stripe-js` + `@stripe/react-stripe-js`, upgraded to
 * the embedded Checkout line as part of the checkout module replacement).
 *
 * The session is created server-side (`POST /api/checkout/sessions`) from the
 * server-authoritative cart; on successful payment Stripe redirects to the
 * return_url set on the session (/checkout/success?session_id=...).
 */

// Mirror the server-side STRIPE_ENV selector (build-time inlined). The session
// is created with the matching secret key, so the publishable key must come
// from the same account pair.
const PUBLISHABLE_KEY =
  (process.env.NEXT_PUBLIC_STRIPE_ENV === "live"
    ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE
    : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST) ||
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

const stripePromise = PUBLISHABLE_KEY ? loadStripe(PUBLISHABLE_KEY) : null

function CheckoutInner() {
  const searchParams = useSearchParams()
  const cartRef = searchParams.get("cartRef")

  const fetchClientSecret = useCallback(async () => {
    const res = await fetch("/api/checkout/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cartRef }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error ?? "Failed to create Checkout Session")
    }
    return data.clientSecret as string
  }, [cartRef])

  return (
    <main className={s.checkoutMain}>
      <h1 className={s.title}>Checkout</h1>

      {!cartRef ? (
        <p className={s.hint}>
          No cart to check out — go back to the{" "}
          <Link href="/cart" className={s.link}>
            cart
          </Link>{" "}
          and build one first.
        </p>
      ) : !stripePromise ? (
        <p className={s.error}>
          Stripe is not configured — set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in
          your environment.
        </p>
      ) : (
        <div className={s.frame}>
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{ fetchClientSecret }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        </div>
      )}
    </main>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<p className={s.hint}>Loading checkout…</p>}>
      <CheckoutInner />
    </Suspense>
  )
}
