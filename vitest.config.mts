import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

/**
 * Vitest configuration for the pure/unit layer (testing-foundation map #126).
 *
 * The specs are co-located `*.test.ts` files beside the modules they cover, and
 * they exercise **pure** logic only — no network, no credentials, no browser. So
 * the environment is plain Node and the globals are off (specs import `expect`
 * etc. explicitly, which also keeps `tsc` honest about them).
 *
 * The `@/…` aliases mirror `tsconfig.json`'s `paths`: the modules under test
 * import each other through them, so Vitest has to resolve the same map. (This
 * file's own imports use relative paths, as Vite config files do.)
 */
const src = fileURLToPath(new URL("./src", import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      "@": src,
      "@components": `${src}/components`,
      "@fragments": `${src}/fragments`,
      "@layouts": `${src}/layouts`,
      "@lib": `${src}/lib`,
      "@modules": `${src}/modules`,
      "@styles": `${src}/styles`,
      "@svg": `${src}/svg`,
      "@types": `${src}/types`,
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
})
