import { execFileSync } from "node:child_process"
import path from "node:path"
import { pathToFileURL } from "node:url"

/**
 * The environment the E2E run hands to the Next server (build **and** start).
 *
 * Why overrides are load-bearing: Next's `@next/env` never overwrites a variable
 * that is already present in `process.env`, so anything set on the spawned
 * process wins over `.env.local`. That file holds **production** Supabase
 * credentials and `STRIPE_ENV=live`, and `NEXT_PUBLIC_*` values are inlined at
 * build time — so these have to be in the webServer env, not merely in the test
 * process.
 *
 * The Stripe *secret* and *publishable* keys are deliberately absent: they are
 * left to `.env.local` (both are `sk_test_…` / `pk_test_…`), and the
 * `STRIPE_ENV=test` / `NEXT_PUBLIC_STRIPE_ENV=test` pair below makes the app
 * select them.
 */

/**
 * Absolute `file://` URL of the stack module, so it can be loaded by native
 * `import()` — bypassing Playwright's require hook, which transpiles `.mjs` to
 * CJS and breaks its `import.meta.url`.
 */
export const E2E_STACK_MODULE_URL = pathToFileURL(
  path.resolve(__dirname, "../scripts/db/stack.mjs")
).href

/** The shared loopback guard the integration layer also runs (side-effect module). */
export const E2E_ASSERT_LOCAL_MODULE_URL = pathToFileURL(
  path.resolve(__dirname, "../scripts/db/assert-local.mjs")
).href

/**
 * Reads the stack's own constants from a plain `node` subprocess — native ESM,
 * no Playwright transform — so `SUPABASE_URL` and the service-role key have a
 * single source of truth (`scripts/db/stack.mjs`) instead of being duplicated
 * here where they could silently drift.
 */
function readStackConstants(): { url: string; key: string } {
  const script =
    `const m = await import(${JSON.stringify(E2E_STACK_MODULE_URL)});` +
    "process.stdout.write(JSON.stringify({ url: m.SUPABASE_URL, key: m.serviceRoleKey() }))"
  const printed = execFileSync(
    process.execPath,
    ["--input-type=module", "-e", script],
    { encoding: "utf8" }
  )
  return JSON.parse(printed) as { url: string; key: string }
}

const { url: SUPABASE_URL, key: SERVICE_ROLE_KEY } = readStackConstants()

/** The loopback Supabase stack the integration layer already builds (#129). */
export const E2E_SUPABASE_URL = SUPABASE_URL
export const E2E_SERVICE_ROLE_KEY = SERVICE_ROLE_KEY

/**
 * The browser origin and `NEXT_PUBLIC_BASE_URL` are **the same value on purpose**.
 *
 * The cart is a `localStorage` store, so it is origin-scoped; and the checkout
 * `return_url` is built from the inlined `NEXT_PUBLIC_BASE_URL`. If the browser
 * origin and that value differed (`localhost` vs `127.0.0.1` are different
 * origins) the post-Checkout redirect would land on an origin whose
 * `localStorage` has no cart — and `recordOrder` would insert an order with no
 * cart snapshot. Keep them identical.
 */
export const E2E_PORT = 8000
export const E2E_BASE_URL = `http://127.0.0.1:${E2E_PORT}`

/** Non-secret placeholder: the build only needs the Resend key to be constructible. */
const RESEND_PLACEHOLDER = "re_e2e_placeholder_not_a_real_key"

/**
 * The env for the `webServer` command. Inherits the ambient process env (so CI's
 * secret-provided CMS/Stripe-test vars flow through) and then forces the
 * loopback/test overrides that must beat `.env.local`.
 */
export const e2eWebServerEnv: Record<string, string> = {
  ...(process.env as Record<string, string>),
  NEXT_PUBLIC_SUPABASE_URL: E2E_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: E2E_SERVICE_ROLE_KEY,
  STRIPE_ENV: "test",
  NEXT_PUBLIC_STRIPE_ENV: "test",
  NEXT_PUBLIC_BASE_URL: E2E_BASE_URL,
  RESEND_API_KEY: RESEND_PLACEHOLDER,
}
