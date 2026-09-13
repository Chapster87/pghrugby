import BreakpointIndicator from "@/components/breakpoint-indicator"
import Footer from "@/components/footer"
import Header from "@/components/header"

import { Providers } from "../providers"

// The embedded ForgeCMS CDA lives in this same app, so it is unreachable during
// `next build` — the site being built isn't live yet. Render the public site at
// request time instead of prerendering it against an empty CMS. CMS reads stay
// Data-Cache'd (`src/lib/forgecms/execute-query.ts`), so this is not a query per hit.
export const dynamic = "force-dynamic"

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
