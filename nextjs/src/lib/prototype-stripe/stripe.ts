import "server-only"

import Stripe from "stripe"

/**
 * PROTOTYPE — server-side Stripe client for the spike.
 *
 * Production swap note: this is the real `stripe` SDK (v22, installed for this
 * spike) — the same one the production build will use, so the spike maps 1:1.
 * The spike's client side loads Stripe.js from the CDN instead (see the
 * checkout page) because the installed `@stripe/stripe-js` version predates
 * `initEmbeddedCheckout`; production should upgrade the client packages.
 */

export const PROTOTYPE_STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY

export const stripe = PROTOTYPE_STRIPE_SECRET_KEY
  ? new Stripe(PROTOTYPE_STRIPE_SECRET_KEY)
  : null

/** Publishable key for the client. Falls back to the Medusa-era env name. */
export const PROTOTYPE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_STRIPE_KEY

/** Base URL used to build the embedded Checkout `return_url`. */
export const PROTOTYPE_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000"
