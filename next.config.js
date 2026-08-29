const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

// Storefront catalog — single source of truth for the Stripe-backed product
// set. `flows` drive the clean-URL rewrites + legacy `/product/*` redirects;
// `products` carry the sku -> WooCommerce slug mapping used by the DatoCMS
// seed script. Anything not in this manifest has no page and 404s.
//
// RESERVED SLUGS (do not create DatoCMS pages or routes with these):
//   /dues · /golf-outing · /steel-city-7s · /donate     (PDP clean URLs)
//   /product/*                                         (internal storefront route)
//   /cart · /checkout · /checkout/success · /membership · /calendar · /contact
//   /links · /matches/* · /sitemap · /styleguide        (static routes)
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
  eslint: {
    ignoreDuringBuilds: true,
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
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
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
    ]
  },
}

module.exports = nextConfig
