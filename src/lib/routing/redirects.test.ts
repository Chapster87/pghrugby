import { readdirSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import storefrontCatalog from "@/lib/checkout/storefront-catalog.json"
import { getRedirects, LEGACY_PRODUCT_REDIRECTS } from "../../../redirects.js"

/**
 * The redirect table in `redirects.js` — the invariants Next.js needs, plus the
 * ones that keep a retired URL from becoming a redirect-to-404.
 *
 * `next.config.js` rejects the whole table if two rows share a `source`, and a
 * destination that isn't a real route turns a 308 into a 308 → 404 chain. Both
 * are cheap to check offline, so they are checked here rather than discovered in
 * production.
 *
 * Known destinations are the PDP clean URLs (`flows[].slug`) plus every static
 * route under `src/app`. Dynamic routes (`[slug]`, `[demo]`) are skipped: their
 * reachable set lives in DatoCMS, so it can't be validated without a query.
 */

const APP_DIR = fileURLToPath(new URL("../../app", import.meta.url))

/** Every static route the App Router serves, e.g. `/links`, `/matches/all`. */
function staticRoutes(dir = APP_DIR, prefix = ""): string[] {
  const routes: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      // Route groups `(core)` don't appear in the URL; dynamic segments
      // `[slug]` can't be enumerated offline.
      if (entry.name.startsWith("(")) {
        routes.push(...staticRoutes(join(dir, entry.name), prefix))
      } else if (!entry.name.startsWith("[")) {
        routes.push(
          ...staticRoutes(join(dir, entry.name), `${prefix}/${entry.name}`)
        )
      }
    } else if (entry.name === "page.tsx") {
      routes.push(prefix || "/")
    }
  }
  return routes
}

const redirects = getRedirects(storefrontCatalog)
const flowSlugs = storefrontCatalog.flows.map((flow) => flow.slug)
const knownDestinations = new Set([
  ...flowSlugs.map((slug) => `/${slug}`),
  ...staticRoutes(),
])

describe("redirects", () => {
  it("has a unique source per row", () => {
    const sources = redirects.map((row) => row.source)
    expect(sources).toHaveLength(new Set(sources).size)
  })

  it("points every destination at a route that exists", () => {
    const unknown = redirects
      .map((row) => row.destination)
      .filter((destination) => !knownDestinations.has(destination))
    expect(unknown).toEqual([])
  })

  it("does not shadow a flow slug with a legacy row", () => {
    const collisions = Object.keys(LEGACY_PRODUCT_REDIRECTS).filter((wcSlug) =>
      flowSlugs.includes(wcSlug)
    )
    expect(collisions).toEqual([])
  })

  it("keeps every legacy row in the served table", () => {
    const sources = new Set(redirects.map((row) => row.source))
    const missing = Object.keys(LEGACY_PRODUCT_REDIRECTS)
      .map((wcSlug) => `/product/${wcSlug}`)
      .filter((source) => !sources.has(source))
    expect(missing).toEqual([])
  })
})
