import {
  E2E_ASSERT_LOCAL_MODULE_URL,
  E2E_SERVICE_ROLE_KEY,
  E2E_STACK_MODULE_URL,
  E2E_SUPABASE_URL,
} from "./stack-env"

/**
 * Native `import()` that Playwright's esbuild transform cannot rewrite into a
 * `require` — `scripts/db/stack.mjs` must load as real ESM (it uses
 * `import.meta.url`), which the require hook would break by transpiling it to CJS.
 */
const nativeImport = new Function("specifier", "return import(specifier)") as (
  specifier: string
) => Promise<Record<string, unknown>>

/**
 * E2E global setup: prove the destination is loopback, then bring the stack up.
 *
 * The guard runs **first and before anything else**. It sets the exact Supabase
 * URL the app under test will use, then loads `scripts/db/assert-local.mjs`, the
 * same loopback guard the integration layer runs — so a non-loopback (or unset)
 * URL aborts the whole run before a single row can be written. This is the
 * suite's most important constraint: it writes real order rows, and it must be
 * incapable of writing them to the production project.
 *
 * The stack is the throwaway Postgres + PostgREST built for #129
 * (`scripts/db/stack.mjs`), served under the `/rest/v1` mount the app's
 * transport (`src/lib/checkout/supabase.ts`) expects. It runs **in this
 * process** because the `/rest/v1` proxy is an in-process HTTP server — it must
 * outlive setup and serve the whole run.
 */
export default async function globalSetup() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = E2E_SUPABASE_URL
  process.env.SUPABASE_SERVICE_ROLE_KEY = E2E_SERVICE_ROLE_KEY
  await nativeImport(E2E_ASSERT_LOCAL_MODULE_URL)

  const { startStack } = (await nativeImport(E2E_STACK_MODULE_URL)) as {
    startStack: () => Promise<{ url: string; serviceRoleKey: string }>
  }
  const started = await startStack()

  // The config named these from a `node` subprocess; assert the live stack
  // agrees, so a drift between the two can never point the app and the guard at
  // different destinations.
  if (
    started.url !== E2E_SUPABASE_URL ||
    started.serviceRoleKey !== E2E_SERVICE_ROLE_KEY
  ) {
    throw new Error(
      "E2E stack constants drifted from e2e/stack-env.ts — refusing to run."
    )
  }
}
