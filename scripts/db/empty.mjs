/**
 * Stands in for the `server-only` guard under Vitest (see the alias in
 * `vitest.integration.config.mts`).
 *
 * The real `server-only` module throws when imported outside a server component,
 * which a plain Node test context is. The integration suite deliberately drives
 * server-only code — it *is* the real write path — so that import resolves here
 * instead.
 */
export {}
