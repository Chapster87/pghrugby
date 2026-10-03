import { defineConfig } from "vitest/config"

import { resolveAlias } from "./vitest.shared.mts"

/**
 * Vitest configuration for the pure/unit layer (testing-foundation map #126).
 *
 * The specs are co-located `*.test.ts` files beside the modules they cover, and
 * they exercise **pure** logic only — no network, no credentials, no browser. So
 * the environment is plain Node and the globals are off (specs import `expect`
 * etc. explicitly, which also keeps things honest).
 *
 * Integration specs (`*.integration.test.ts`) are excluded here; they need the
 * local Postgres/PostgREST stack and run via `pnpm test:integration`
 * (`vitest.integration.config.mts`).
 */
export default defineConfig({
  resolve: { alias: resolveAlias },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/*.integration.test.ts"],
  },
})
