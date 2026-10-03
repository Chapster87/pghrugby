import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

import { serviceRoleKey, SUPABASE_URL } from "./scripts/db/stack.mjs"
import { resolveAlias } from "./vitest.shared.mts"

/**
 * Vitest configuration for the integration layer (testing-foundation map #126).
 *
 * These specs drive the real order/cart write path against a throwaway local
 * Postgres + PostgREST stack (see `scripts/db/stack.mjs`), started and stopped by
 * the global setup.
 *
 * `envDir` points away from the repo root so `.env.local` — which holds the
 * production Supabase credentials — is never loaded. The only Supabase config in
 * scope is the local-only URL and key below, and `scripts/db/assert-local.mjs`
 * refuses anything non-loopback as a second line of defence.
 *
 * The URL and JWT are constants of `stack.mjs`, so the config does not need a
 * running stack to name them.
 */
export default defineConfig({
  envDir: fileURLToPath(new URL("./scripts/db", import.meta.url)),
  resolve: {
    alias: {
      ...resolveAlias,
      // `supabase.ts` and `stripe.ts` are marked `server-only`; that guard only
      // means something to the Next bundler, and under Vitest's plain Node
      // context it throws. The integration suite drives that code on purpose, so
      // resolve the guard to an empty module.
      "server-only": fileURLToPath(
        new URL("./scripts/db/empty.mjs", import.meta.url)
      ),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    globalSetup: ["./scripts/db/vitest-global-setup.mjs"],
    setupFiles: ["./scripts/db/assert-local.mjs"],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey(),
      // Dummy local Stripe values (never real keys): the webhook route reads
      // `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` at import time, and its spec
      // signs payloads against the same secret.
      STRIPE_SECRET_KEY: "sk_test_local",
      STRIPE_WEBHOOK_SECRET: "whsec_test_local",
    },
  },
})
