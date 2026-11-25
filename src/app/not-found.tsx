import { Metadata } from "next"

import NotFoundContent from "@/components/not-found"
import SiteChrome from "@/layouts/site-chrome"

export const metadata: Metadata = {
  title: "404",
  description: "Something went wrong",
}

/**
 * Root 404 — rendered for URLs that match no route at all. No route-group
 * layout wraps it, so it composes `SiteChrome` itself to keep the header and
 * footer. A `notFound()` call inside a group renders that group's boundary
 * instead (see `(core)/not-found.tsx`).
 */
export default function NotFound() {
  return (
    <SiteChrome>
      <NotFoundContent />
    </SiteChrome>
  )
}
