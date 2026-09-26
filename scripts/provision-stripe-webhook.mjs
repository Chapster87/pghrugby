#!/usr/bin/env node
/**
 * Provision the LIVE Stripe webhook endpoint the site's order recording and
 * refund reconciliation depend on (`/api/checkout/webhook`; see
 * `docs/agents/stripe-webhook-wiring.md`).
 *
 * Registers one event destination on the live account, subscribed to exactly the
 * events `src/app/api/checkout/webhook/route.ts` handles. Idempotent by an exact
 * URL match: an endpoint already registered at the target URL is reused and its
 * `enabled_events` corrected in place. Nothing is deleted, and an equivalent
 * destination at a *different* URL (a trailing slash, the other scheme) is not
 * recognised — a second endpoint is created instead.
 *
 * Stripe returns the endpoint's `whsec_...` signing secret **only** in the create
 * response. On create this script prints it once, so it can be pasted into the
 * production environment; afterwards reveal it in Workbench → Webhooks. It is
 * never stored by this script.
 *
 * Usage (from the repo root, after `nvm use`):
 *   pnpm provision:stripe:webhook            # dry-run: live inventory + plan, no writes
 *   pnpm provision:stripe:webhook:apply      # create/update the endpoint, print the secret
 *   node ./scripts/provision-stripe-webhook.mjs --url=https://pghrugby.com/api/checkout/webhook
 *
 * Reads STRIPE_SECRET_KEY_LIVE from `.env.local`.
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import Stripe from "stripe"

const APPLY = process.argv.includes("--apply")

const WEBHOOK_PATH = "/api/checkout/webhook"
// The production deploy's pre-cutover origin (ADR-0001). At cutover the apex
// takes over and `next.` canonical-redirects to it — Stripe treats a 3xx as a
// delivery failure, so the endpoint must be re-pointed then, not left on `next.`.
const DEFAULT_URL = `https://next.pghrugby.com${WEBHOOK_PATH}`

const urlArg = process.argv.find((arg) => arg.startsWith("--url="))
const TARGET_URL = urlArg ? urlArg.slice("--url=".length) : DEFAULT_URL

// Exactly the event map in src/app/api/checkout/webhook/route.ts. Listening more
// broadly is discouraged by Stripe and would ack events nothing consumes.
const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
  "charge.refunded",
]

const DESCRIPTION = "pghrugby site — order records + refund reconciliation"

const ENV_LOCAL = resolve(import.meta.dirname, "../.env.local")

// --- env ---------------------------------------------------------------------
/**
 * Parses `.env.local` into an object. First definition of a key wins; surrounding
 * quotes are stripped. Mirrors the loader in `provision-stripe-catalog.mjs`.
 *
 * @returns {Record<string, string>}
 */
function loadEnvLocal() {
  const env = {}
  for (const rawLine of readFileSync(ENV_LOCAL, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    const value = line
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "")
    if (!(key in env)) env[key] = value
  }
  return env
}

const secretKey = loadEnvLocal().STRIPE_SECRET_KEY_LIVE
if (!secretKey) {
  console.error(
    "STRIPE_SECRET_KEY_LIVE is not set in .env.local — add the live secret key first."
  )
  process.exit(1)
}
if (!secretKey.startsWith("sk_live_")) {
  console.error(
    "STRIPE_SECRET_KEY_LIVE does not start with sk_live_ — refusing to run against a non-live key."
  )
  process.exit(1)
}

if (!TARGET_URL.startsWith("https://")) {
  console.error(`Refusing a non-HTTPS endpoint URL: ${TARGET_URL}`)
  process.exit(1)
}

const stripe = new Stripe(secretKey)

// --- helpers ------------------------------------------------------------------
/**
 * Order- and duplicate-insensitive comparison of two event lists, so a re-run
 * that asks for the same events is a no-op.
 *
 * @param {string[]} a
 * @param {string[]} b
 * @returns {boolean}
 */
function sameEventSet(a, b) {
  const norm = (list) => [...new Set(list)].sort()
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b))
}

/**
 * One-line rendering of a Stripe endpoint for the inventory listing, flagging a
 * destination that is not enabled.
 *
 * @param {{ id: string, url: string, status: string }} endpoint
 * @returns {string}
 */
function describeEndpoint(endpoint) {
  const status = endpoint.status === "enabled" ? "" : ` [${endpoint.status}]`
  return `${endpoint.id} — ${endpoint.url}${status}`
}

// --- current inventory --------------------------------------------------------
console.log(
  `\n=== Live account event destinations (${
    APPLY ? "applying" : "dry-run"
  }) ===`
)
const { data: endpoints } = await stripe.webhookEndpoints.list({ limit: 100 })
if (endpoints.length === 0) {
  console.log("  (none registered)")
}
for (const endpoint of endpoints) {
  console.log(`  ${describeEndpoint(endpoint)}`)
  console.log(
    `      events: ${endpoint.enabled_events.join(", ")}\n      api: ${
      endpoint.api_version ?? "(account default)"
    }`
  )
}

// --- plan ---------------------------------------------------------------------
const existing = endpoints.find((endpoint) => endpoint.url === TARGET_URL)

console.log(`\n=== Planned destination ===`)
console.log(`  url:    ${TARGET_URL}`)
console.log(`  events: ${WEBHOOK_EVENTS.join(", ")}`)

let createdSecret = null

if (!existing) {
  if (APPLY) {
    const endpoint = await stripe.webhookEndpoints.create({
      url: TARGET_URL,
      enabled_events: WEBHOOK_EVENTS,
      description: DESCRIPTION,
    })
    createdSecret = endpoint.secret ?? null
    console.log(`\n  [created] ${endpoint.id}`)
  } else {
    console.log(`\n  [create] no endpoint at this URL yet`)
  }
} else if (sameEventSet(existing.enabled_events, WEBHOOK_EVENTS)) {
  console.log(
    `\n  [reused] ${existing.id} — already subscribed to the required events`
  )
  if (existing.status !== "enabled") {
    console.warn(
      `  [warn]   ${existing.id} is "${existing.status}" — re-enable it in Workbench → Webhooks or Stripe will not deliver.`
    )
  }
} else if (APPLY) {
  const endpoint = await stripe.webhookEndpoints.update(existing.id, {
    enabled_events: WEBHOOK_EVENTS,
  })
  console.log(
    `\n  [updated] ${endpoint.id} — enabled_events corrected to the required set`
  )
} else {
  console.log(
    `\n  [update] ${existing.id} — enabled_events differ from the required set`
  )
  console.log(`           have: ${existing.enabled_events.join(", ")}`)
}

// --- output -------------------------------------------------------------------
if (!APPLY) {
  console.log(
    `\nDry-run complete — [create]/[update] marks the change a re-run with --apply would make.\n`
  )
  process.exit(0)
}

console.log(`\n=== Done ===`)
if (createdSecret) {
  console.log(
    "\nSigning secret (shown once, at creation — copy it now):\n\n  " +
      createdSecret +
      "\n"
  )
  console.log(
    "Set it in the production environment (the route prefers this name when\n" +
      "STRIPE_ENV=live, falling back to STRIPE_WEBHOOK_SECRET):\n\n" +
      "  npx netlify-cli@latest env:set STRIPE_WEBHOOK_SECRET_LIVE --context production --secret\n"
  )
  console.log(
    "Netlify needs a redeploy for a new variable to reach the running functions.\n" +
      "If you lose the secret, reveal it in Workbench → Webhooks (or roll it), then re-set it."
  )
} else {
  console.log(
    "No secret printed — the endpoint already existed. Reveal its signing secret\n" +
      "in Workbench → Webhooks (Click to reveal) if STRIPE_WEBHOOK_SECRET_LIVE is unset."
  )
}
