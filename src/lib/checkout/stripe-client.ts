import { loadStripe, type Stripe } from "@stripe/stripe-js"

/**
 * The browser's Stripe.js handle, shared by every embedded-Checkout surface.
 *
 * Mirror the server-side `STRIPE_ENV` selector (`src/lib/checkout/stripe.ts`).
 * The session is created with the matching secret key, so the publishable key
 * must come from the same account pair.
 *
 * `NEXT_PUBLIC_*` vars are inlined at build time, so toggling accounts requires
 * a dev-server restart or rebuild. `loadStripe` is safe to call during SSR of a
 * client component — it only loads the script in the browser.
 */

const PUBLISHABLE_KEY =
  (process.env.NEXT_PUBLIC_STRIPE_ENV === "live"
    ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE
    : process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST) ||
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

/** Null when no publishable key is configured — the surfaces render a notice. */
export const stripePromise: Promise<Stripe | null> | null = PUBLISHABLE_KEY
  ? loadStripe(PUBLISHABLE_KEY)
  : null
