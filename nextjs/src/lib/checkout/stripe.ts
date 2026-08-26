import "server-only"

import Stripe from "stripe"

/**
 * Server-side Stripe client for embedded Checkout.
 *
 * Uses the production `stripe` SDK (v22+). The client side loads Stripe.js via
 * `@stripe/stripe-js` / `@stripe/react-stripe-js` (upgraded to the embedded
 * Checkout line as part of the checkout module replacement).
 */

const secretKey = process.env.STRIPE_SECRET_KEY

export const stripe = secretKey ? new Stripe(secretKey) : null

/**
 * Publishable key for the client. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is the
 * canonical name (the Medusa-era `NEXT_PUBLIC_STRIPE_KEY` is kept as a
 * fallback until the environment inventory cleanup lands).
 */
export const STRIPE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_STRIPE_KEY

/**
 * Base URL used to build the embedded Checkout `return_url`. Falls back to a
 * local dev origin so the flow works without env setup.
 */
export const CHECKOUT_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000"
