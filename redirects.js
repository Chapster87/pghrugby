// Permanent (308) redirects, kept out of `next.config.js` so the routing table
// reads as data rather than being buried among the other config blocks.
//
// Two families:
//
//   1. `/product/{flowSlug}` -> `/{flowSlug}` — the legacy in-app PDP URL for
//      each clean URL. Derived from `flows[].slug` because the same list drives
//      the rewrites: a slug added there must get both, or the clean URL 404s.
//   2. `/product/{wcSlug}` -> `/{pdp}` — retired WordPress WooCommerce product
//      URLs. Hand-maintained on purpose (see `legacyProductRedirects`).
//
// Every other `/product/*` falls through to the storefront route and 404s
// (no page).
function getRedirects(catalog) {
  const flowSlugs = catalog.flows.map((flow) => flow.slug)

  const legacyProductRedirects = Object.entries(LEGACY_PRODUCT_REDIRECTS)
    // A wcSlug that matches a flow slug is already covered by family 1; a
    // duplicate source would make Next reject the whole table.
    .filter(([wcSlug]) => !flowSlugs.includes(wcSlug))
    .map(([wcSlug, destination]) => ({
      source: `/product/${wcSlug}`,
      destination,
      permanent: true,
    }))

  return [
    ...flowSlugs.map((slug) => ({
      source: `/product/${slug}`,
      destination: `/${slug}`,
      permanent: true,
    })),
    ...legacyProductRedirects,
    {
      source: "/home",
      destination: "/",
      permanent: true,
    },
    {
      source: "/club-donation",
      destination: "/donate",
      permanent: true,
    },
    {
      source: "/social-links",
      destination: "/links",
      permanent: true,
    },
    {
      source: "/style-guide",
      destination: "/styleguide",
      permanent: true,
    },
  ]
}

// Retired WooCommerce product slug -> the PDP that now sells it. Static and
// hand-maintained: this is a migration artifact, not a view of the catalog, so
// it should not change when a product is added or renamed. Add a row when a
// retired `/product/*` URL needs to keep resolving; delete rows once the old
// URLs stop mattering.
//
// Source of the initial set: `docs/research/wordpress-url-inventory.md`.
// `golf-outing-sponsorship` is absent because its wcSlug equals a flow slug and
// is already redirected by family 1.
const LEGACY_PRODUCT_REDIRECTS = {
  "dues-fall": "/dues",
  "dues-spring": "/dues",
  "team-dues": "/dues",
  "golf-outing-registration": "/golf-outing",
  "golf-outing-ticket": "/golf-outing",
  mulligan: "/golf-outing",
  "golf-outing-all-you-can-drink": "/golf-outing",
  "sc7s-mens-additional-side": "/steel-city-7s",
  "sc7s-mens-open-division": "/steel-city-7s",
  "sc7s-mens-social-division": "/steel-city-7s",
  "sc7s-mens-super-social-division": "/steel-city-7s",
  "sc7s-womens-additional-side": "/steel-city-7s",
  "sc7s-womens-open-division": "/steel-city-7s",
  "sc7s-womens-social-division": "/steel-city-7s",
  "steel-city-7s-registration": "/steel-city-7s",
  "club-donation": "/donate",
  "pass-the-hat": "/donate",
  "ballpark-day": "/ballpark",
  "ballpark-day-adult": "/ballpark",
  "ballpark-ticket-16-under": "/ballpark",
  "nfl-survivor-pool-ticket": "/survivor-pool",
  "nfl-survivor-pool-insurance": "/survivor-pool",
  "steel-city-7s-bar-crawl": "/bar-crawl",
  "annual-forge-pig-roast": "/pig-roast",
  "supporter-dues": "/membership",
}

module.exports = { getRedirects, LEGACY_PRODUCT_REDIRECTS }
