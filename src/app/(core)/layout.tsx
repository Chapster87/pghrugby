import BreakpointIndicator from "@/components/breakpoint-indicator"
import Footer from "@/components/footer"
import Header from "@/components/header"

import { Providers } from "../providers"

// ISR floor for the group: the ceiling on how stale CDA-backed content (chrome,
// standings, schedule) is served. An on-demand purge from the publish signal
// (`src/app/api/revalidate/route.ts`) is the fast path.
//
// Chrome reads pass no `graceful`: a failed regeneration serves the last good
// page, so degrading instead would blank the chrome.
export const revalidate = 3600

/**
 * Layout for the `(core)` route group — the main public site. No <html>/<body>
 * here: the root layout owns the document shell. This wrapper keeps the site's
 * providers, breakpoint indicator, and header/footer chrome under it.
 */
export default function CoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Providers>
      <BreakpointIndicator />
      <div className="siteMain">
        <Header />
        {children}
        <Footer />
      </div>
    </Providers>
  )
}
