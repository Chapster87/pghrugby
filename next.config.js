const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

// A non-production Netlify deploy — the `trunk` branch deploy — is publicly
// reachable and, unlike a Deploy Preview, is NOT `noindex`ed by the platform, so
// it would otherwise be crawled. `netlify.toml` cannot express this: its
// `[[headers]]` and `[[redirects]]` sections are global for every build and
// cannot be scoped to a deploy context, while an environment variable can be.
// Set `SITE_NOINDEX=true` as the `branch-deploy` context value and this build
// emits the header; production leaves it unset.
const siteNoindex = process.env.SITE_NOINDEX === "true"

// Storefront catalog — single source of truth for the Stripe-backed product
// set. `flows` drive the clean-URL rewrites + legacy `/product/*` redirects;
// `products` carry the sku -> WooCommerce slug mapping used by the DatoCMS
// seed script. Anything not in this manifest has no page and 404s.
//
// RESERVED SLUGS (do not create DatoCMS pages or routes with these):
//   /dues · /golf-outing · /steel-city-7s · /donate     (PDP clean URLs)
//   /pig-roast · /bar-crawl · /ballpark · /survivor-pool (PDP clean URLs)
//   /product/*                                         (internal storefront route)
//   /cart · /checkout · /checkout/success · /membership · /calendar · /contact
//   /links · /matches/* · /sitemap · /styleguide        (static routes)
//   /workbench/*                                        (dev-only; 404s in production)
const storefrontCatalog = require("./src/lib/checkout/storefront-catalog.json")

const pdpSlugs = storefrontCatalog.flows.map((flow) => flow.slug)

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      // Cart-line thumbnails come from Stripe Product images, resolved by
      // expanding a Price's Product (`src/lib/checkout/product-image.ts`).
      {
        protocol: "https",
        hostname: "files.stripe.com",
      },
    ],
  },
  // beforeFiles: PDP clean URLs win over root [slug] pages (products own slugs).
  async rewrites() {
    return [
      ...pdpSlugs.map((slug) => ({
        source: `/${slug}`,
        destination: `/product/${slug}`,
      })),
    ]
  },
  // Permanent (308): legacy in-app product URLs -> clean URLs. Every other
  // /product/* falls through to the storefront route and 404s (no page).
  async redirects() {
    return [
      ...pdpSlugs.map((slug) => ({
        source: `/product/${slug}`,
        destination: `/${slug}`,
        permanent: true,
      })),
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
  },
  // Keep a non-production deploy out of search results. See `siteNoindex` above
  // for why this lives here rather than in `netlify.toml`.
  async headers() {
    if (!siteNoindex) return []

    return [
      {
        source: "/(.*)",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
    ]
  },
}

module.exports = nextConfig
