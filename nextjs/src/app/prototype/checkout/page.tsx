"use client"

import { useCallback, useEffect, useRef, useState, Suspense } from "react"

import Link from "next/link"
import { useSearchParams } from "next/navigation"

import styles from "../prototype.module.css"

/**
 * PROTOTYPE — embedded Checkout page.
 *
 * Mounts Stripe embedded full-page Checkout via Stripe.js loaded from the CDN
 * (js.stripe.com/v3). The installed @stripe/stripe-js version predates
 * initEmbeddedCheckout, and upgrading it risks the still-live Medusa checkout
 * — so the spike uses the CDN build. Production should upgrade the client
 * packages and use the React provider instead.
 *
 * On successful payment Stripe redirects to the return_url that was set on
 * session creation (/prototype/return?session_id=...).
 *
 * Dev-mode StrictMode double-mounts effects, so checkout creation is
 * serialized through a module-level queue and any instance whose effect was
 * cancelled is destroyed — otherwise Stripe throws "You cannot have multiple
 * Embedded Checkout objects."
 */

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_STRIPE_KEY ||
  ""

type EmbeddedCheckoutHandle = {
  mount: (element: HTMLElement) => void
  destroy: () => void
}

type StripeFactory = (key: string) => {
  initEmbeddedCheckout: (options: {
    fetchClientSecret: () => Promise<string>
  }) => Promise<EmbeddedCheckoutHandle>
}

/**
 * The installed @stripe/stripe-js declares its own global `Window.Stripe`
 * (without embedded checkout), so we read the CDN-loaded factory through a
 * cast instead of re-augmenting the global.
 */
const getStripeFactory = (): StripeFactory | undefined =>
  (window as unknown as { Stripe?: StripeFactory }).Stripe

/** Loads the CDN script exactly once, resolving to the Stripe factory. */
let stripeScriptPromise: Promise<StripeFactory> | null = null

function loadStripeFactory(): Promise<StripeFactory> {
  if (!stripeScriptPromise) {
    stripeScriptPromise = new Promise((resolve, reject) => {
      const existing = getStripeFactory()
      if (existing) {
        resolve(existing)
        return
      }
      const script = document.createElement("script")
      script.src = "https://js.stripe.com/v3/"
      script.onload = () => {
        const factory = getStripeFactory()
        if (factory) resolve(factory)
        else reject(new Error("Stripe.js loaded but window.Stripe is missing"))
      }
      script.onerror = () =>
        reject(new Error("Failed to load Stripe.js from CDN"))
      document.head.appendChild(script)
    })
  }
  return stripeScriptPromise
}

/** Serializes initEmbeddedCheckout calls so two can never overlap. */
let checkoutInitQueue: Promise<void> = Promise.resolve()

function CheckoutInner() {
  const searchParams = useSearchParams()
  const cartRef = searchParams.get("cartRef")

  const mountRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchClientSecret = useCallback(async () => {
    const res = await fetch("/api/prototype/checkout-sessions", {
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

  useEffect(() => {
    if (!cartRef) {
      setError("Missing cartRef — go back to the cart and build one first.")
      return
    }

    if (!PUBLISHABLE_KEY) {
      setError(
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set — add a test-mode publishable key to .env.local."
      )
      return
    }

    let checkout: EmbeddedCheckoutHandle | null = null
    let active = true

    checkoutInitQueue = checkoutInitQueue
      .then(async () => {
        const factory = await loadStripeFactory()
        const handle = await factory(PUBLISHABLE_KEY).initEmbeddedCheckout({
          fetchClientSecret,
        })
        if (!active) {
          // StrictMode already ran the cleanup — this instance is orphaned,
          // so dispose it instead of mounting (a second one is queued).
          handle.destroy()
          return
        }
        checkout = handle
        if (mountRef.current) {
          handle.mount(mountRef.current)
        }
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load embedded Checkout"
          )
        }
      })

    return () => {
      active = false
      checkout?.destroy()
      checkout = null
    }
  }, [cartRef, fetchClientSecret])

  return (
    <>
      <h1>Embedded Checkout</h1>
      <p>
        <Link href="/prototype/cart">← Back to cart</Link>{" "}
        <span style={{ opacity: 0.7 }}>(cartRef: {cartRef ?? "none"})</span>
      </p>
      {error && <div className={styles.error}>{error}</div>}
      <div ref={mountRef} />
    </>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<p>Loading checkout…</p>}>
      <CheckoutInner />
    </Suspense>
  )
}
