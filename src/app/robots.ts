// <host>/src/app/robots.ts — shell-owned, never part of the vendored core subtree.
// Scaffolded by the ForgeCMS vendor CLI from docs/HOST-RUNTIME.md.
import type { MetadataRoute } from "next"

// robots.txt is read only from the origin root, so it can never live inside the
// core subtree. Keep in step with the core's CMS_MOUNT_PATH.
const CMS_MOUNT_PATH = "/admin"

export default function robots(): MetadataRoute.Robots {
  return {
    // Crawl reduction only — the core's admin noindex meta is the de-indexing
    // guarantee (docs/HOST-RUNTIME.md).
    rules: [{ userAgent: "*", disallow: CMS_MOUNT_PATH }],
  }
}
