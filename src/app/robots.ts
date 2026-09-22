import type { MetadataRoute } from "next"

/**
 * The site's own crawl policy. `robots.txt` is origin-scoped, so this says
 * nothing about the CMS origin, which serves its own.
 */
export default function robots(): MetadataRoute.Robots {
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
