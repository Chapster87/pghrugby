import type { MetadataRoute } from "next"

/**
 * The site's own crawl policy. `robots.txt` is origin-scoped, so this says
 * nothing about the CMS origin, which serves its own.
 *
 * A non-production deploy refuses everything, as a belt to the `X-Robots-Tag`
 * header `next.config.js` emits — `robots.txt` only advises well-behaved
 * crawlers, so it cannot carry the policy alone. `SITE_NOINDEX` is read at build
 * time, which is when this route is prerendered.
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.SITE_NOINDEX === "true") {
    return { rules: [{ userAgent: "*", disallow: "/" }] }
  }

  return {
    rules: [
      {
        userAgent: "*",
        // Transactional and machine endpoints: no crawl value, and a crawler
        // walking a cart or checkout session is nothing but cost.
        disallow: ["/api", "/cart", "/checkout"],
      },
    ],
  }
}
