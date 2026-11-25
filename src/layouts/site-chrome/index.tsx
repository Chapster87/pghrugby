import { Providers } from "@/app/providers"
import { CartProvider } from "@/components/cart"
import BreakpointIndicator from "@/components/breakpoint-indicator"
import Footer from "@/components/footer"
import Header from "@/components/header"

/**
 * The public site's chrome — providers, cart, breakpoint indicator, header and
 * footer — shared by the `(core)` layout and the root `not-found` boundary.
 *
 * The root `not-found` renders for URLs that match no route at all, so no route
 * group's layout wraps it; it composes this directly to keep the header/footer
 * on every 404. Route-group boundaries (`(core)`, `(checkout)`) get the same
 * chrome from their own layouts and render only the 404 body.
 */
export default function SiteChrome({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Providers>
      <CartProvider>
        <BreakpointIndicator />
        <div className="siteMain">
          <Header />
          {children}
          <Footer />
        </div>
      </CartProvider>
    </Providers>
  )
}
