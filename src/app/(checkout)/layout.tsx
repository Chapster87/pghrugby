import Header from "@/components/header-checkout"
import Footer from "@/components/footer"
import BreakpointIndicator from "@/components/breakpoint-indicator"
import { lemonMilk } from "@/lib/fonts"

import "@styles/globals.css"

/**
 * Root layout for the `(checkout)` route group. The `(core)` group owns the
 * main site's `<html>`/`<body>`; this group needs its own so the embedded
 * Checkout + success pages render with the site's fonts and global styles.
 */
export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`light ${lemonMilk.variable}`}
      style={{ colorScheme: "light" }}
    >
      <body>
        <BreakpointIndicator />
        <div className="checkoutMain" data-page="checkout">
          <Header />
          {children}
          <Footer />
        </div>
      </body>
    </html>
  )
}
