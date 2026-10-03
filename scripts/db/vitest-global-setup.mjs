import { startStack, stopStack } from "./stack.mjs"

/**
 * Vitest global setup for the integration run: bring the local stack up once,
 * and tear it down at the end. The returned function is Vitest's teardown hook.
 */
export default async function setup() {
  await startStack()
  return async () => {
    await stopStack()
  }
}
