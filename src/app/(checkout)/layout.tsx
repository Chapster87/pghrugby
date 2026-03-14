import Header from "@/components/header-checkout"
import Footer from "@/components/footer"
import BreakpointIndicator from "@components/BreakpointIndicator"

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
