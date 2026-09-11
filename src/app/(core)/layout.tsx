import BreakpointIndicator from "@/components/breakpoint-indicator"
import Footer from "@/components/footer"
import Header from "@/components/header"

import { Providers } from "../providers"

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
