import BreakpointIndicator from "@/components/breakpoint-indicator"
import Footer from "@/components/footer"
import Header from "@/components/header-checkout"

/**
 * Layout for the `(checkout)` route group. No <html>/<body> — the root layout
 * owns the document shell, so the Checkout + success pages inherit the site's
 * fonts and global styles from that single root. This wrapper keeps the embedded
 * checkout header/footer and page wrapper.
 */
export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <BreakpointIndicator />
      <div className="checkoutMain" data-page="checkout">
        <Header />
        {children}
        <Footer />
      </div>
    </>
  )
}
