"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"

import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import RefusedLines from "@/components/cart/_components/refused-lines"
import { cartStore, getCartSnapshot } from "@/components/cart/cart-store"
import type { CartLineError } from "@/lib/checkout/cart-pricing"

import s from "./styles.module.css"

/**
 * Embedded Checkout page — mounts Stripe's full-page embedded Checkout via the
 * React provider (`@stripe/stripe-js` + `@stripe/react-stripe-js`).
 *
 * The session is built server-side from the **browser-held** cart: this page
 * reads its entries out of the cart store and posts them with the `cartRef`, so
 * the server re-resolves prices and availability fresh, writes the `carts`
 * snapshot, and creates the Checkout Session
 * (`docs/pdp-to-minicart-to-checkout-spec.md` § 8.1–8.2).
 *
 * The secret is fetched here and passed to the provider as `clientSecret`
 * rather than through `options.fetchClientSecret`: a refusal has to be shown to
 * the buyer, and that callback has no error surface of its own. A sold-out line
 * therefore renders its own row, with the one click that removes it and
 * re-runs the build. On successful payment Stripe redirects to the return_url
 * set on the session (/checkout/success?session_id=...).
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

  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [lineErrors, setLineErrors] = useState<CartLineError[]>([])
  const [starting, setStarting] = useState(Boolean(cartRef))
  // StrictMode mounts effects twice in development; a Checkout Session is not
  // something to create twice for one visit.
  const started = useRef(false)

  const startCheckout = useCallback(async () => {
    if (!cartRef) return
    setStarting(true)
    setProblem(null)
    setLineErrors([])

    // The link and the browser's cart must agree: the entries travel with the
    // request, so a `cartRef` from another tab's cart would otherwise build a
    // session against the wrong cart.
    const cart = getCartSnapshot()
    if (cart.cartRef !== cartRef) {
      setProblem(
        "This checkout link doesn't match the cart in this browser — open the cart and try again."
      )
      setStarting(false)
      return
    }

    try {
      const res = await fetch("/api/checkout/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // The promotion code rides with the entries: the session build is what
        // resolves it against Stripe and decides whether it applies at all.
        body: JSON.stringify({
          cartRef,
          entries: cart.entries,
          promotionCode: cart.promotionCode,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setProblem(data.error ?? "Failed to create Checkout Session")
        setLineErrors(Array.isArray(data.errors) ? data.errors : [])
        return
      }
      setClientSecret(data.clientSecret)
    } catch {
      setProblem("Network error starting checkout")
    } finally {
      setStarting(false)
    }
  }, [cartRef])

  useEffect(() => {
    if (started.current || !cartRef) return
    started.current = true
    void startCheckout()
  }, [cartRef, startCheckout])

  /** Removes a refused line (cascading) and rebuilds the session. */
  const removeRefusedLine = (entryId: string) => {
    cartStore.remove(entryId)
    void startCheckout()
  }

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
      ) : problem ? (
        <>
          <RefusedLines
            message={problem}
            errors={lineErrors}
            onRemove={removeRefusedLine}
          />
          <p className={s.backLink}>
            <Link href="/cart" className={s.link}>
              Back to the cart
            </Link>
          </p>
        </>
      ) : starting || !clientSecret ? (
        <p className={s.hint}>Loading checkout…</p>
      ) : (
        <div className={s.frame}>
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{ clientSecret }}
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
