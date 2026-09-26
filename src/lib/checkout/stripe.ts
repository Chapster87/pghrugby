import "server-only"

import Stripe from "stripe"

/**
 * Server-side Stripe client for embedded Checkout.
 *
 * Uses the production `stripe` SDK (v22+). The client side loads Stripe.js via
 * `@stripe/stripe-js` / `@stripe/react-stripe-js` (upgraded to the embedded
 * Checkout line as part of the checkout module replacement).
 */

/**
 * Stripe account selector — flips the whole checkout stack between the test and
 * live accounts in one place. `STRIPE_ENV` is server-side; the client mirrors
 * it via `NEXT_PUBLIC_STRIPE_ENV` (NEXT_PUBLIC_ vars are inlined at build time,
 * so toggling requires a dev-server restart / rebuild).
 *
 * Each side prefers its `_LIVE`/`_TEST`-suffixed var and falls back to the
 * canonical unsuffixed name, so local `.env.local` can hold both key pairs and
 * flip `STRIPE_ENV`, while production hosting keeps the canonical trio from the
 * environment inventory (plus `STRIPE_ENV=live`).
 */
export const STRIPE_ENV = process.env.STRIPE_ENV === "live" ? "live" : "test"

export const isLiveStripe = STRIPE_ENV === "live"

function pickStripeKey(
  liveVar: string | undefined,
  testVar: string | undefined,
  canonicalVar: string | undefined
): string | undefined {
  if (isLiveStripe) return liveVar ?? canonicalVar
  return testVar ?? canonicalVar
}

const secretKey = pickStripeKey(
  process.env.STRIPE_SECRET_KEY_LIVE,
  process.env.STRIPE_SECRET_KEY_TEST,
  process.env.STRIPE_SECRET_KEY
)

export const stripe = secretKey ? new Stripe(secretKey) : null

/**
 * A client for the **live** account, for display reads only.
 *
 * A sale is a live Price object, and the amounts the site *advertises* are the
 * live provisioned ones — `catalog.ts` carries live amounts, and the PDP has
 * always shown them whatever `STRIPE_ENV` says. So resolving a sale Price's
 * amount for display must reach the live account even when billing is a
 * rehearsal against test; otherwise a sale authored in the CMS is invisible to
 * the owner who just set it up, and the test-mode display silently disagrees with
 * production. Billing is unaffected: it uses `stripe` above, per `STRIPE_ENV`.
 *
 * Null when no live key is configured (a preview or CI without one), where
 * display falls back to the regular amount.
 */
export const liveStripe = isLiveStripe
  ? stripe
  : process.env.STRIPE_SECRET_KEY_LIVE
  ? new Stripe(process.env.STRIPE_SECRET_KEY_LIVE)
  : null

/**
 * Publishable key for the client. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is the
 * canonical name (the Medusa-era `NEXT_PUBLIC_STRIPE_KEY` is kept as a
 * fallback until the environment inventory cleanup lands).
 */
export const STRIPE_PUBLISHABLE_KEY = pickStripeKey(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_LIVE,
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST,
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
)

/**
 * Webhook signing secret for the selected account. Live events (delivered to
 * the deployed endpoint) verify against the live secret; local `stripe listen`
 * forwards test events and prints a test `whsec_...`.
 */
export const STRIPE_WEBHOOK_SECRET = pickStripeKey(
  process.env.STRIPE_WEBHOOK_SECRET_LIVE,
  process.env.STRIPE_WEBHOOK_SECRET_TEST,
  process.env.STRIPE_WEBHOOK_SECRET
)
