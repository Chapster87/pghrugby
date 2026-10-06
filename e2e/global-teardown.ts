import { E2E_STACK_MODULE_URL } from "./stack-env"

/** See `global-setup.ts` for why this bypasses Playwright's require hook. */
const nativeImport = new Function("specifier", "return import(specifier)") as (
  specifier: string
) => Promise<Record<string, unknown>>

/**
 * E2E global teardown: stop the throwaway Postgres + PostgREST stack.
 *
 * Separate from the setup on purpose — Playwright gives `globalSetup` no way to
 * return a teardown, so the two halves are distinct hooks. Stop failures are
 * swallowed inside `stopStack`; teardown must never mask a test failure.
 */
export default async function globalTeardown() {
  const { stopStack } = (await nativeImport(E2E_STACK_MODULE_URL)) as {
    stopStack: () => Promise<void>
  }
  await stopStack()
}
