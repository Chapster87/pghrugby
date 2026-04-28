import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import SidebarLayout from "@/layouts/sidebar"
import PaymentWrapper from "@modules/checkout/components/payment-wrapper"
import CheckoutForm from "@modules/checkout/templates/checkout-form"
import CheckoutSummary from "@modules/checkout/templates/checkout-summary"
import { Metadata } from "next"
import { notFound } from "next/navigation"
import contentStyles from "@/styles/content.module.css"
import s from "./styles.module.css"

export const metadata: Metadata = {
  title: "Checkout",
}

export default async function Checkout() {
  const cart = await retrieveCart()

  if (!cart) {
    return notFound()
  }

  const customer = await retrieveCustomer()

  return (
    <div className={s.checkoutPage}>
      <div className={contentStyles.primary}>
        <div className={`${contentStyles.contentBlock}`}>
          <PaymentWrapper cart={cart}>
            <CheckoutForm cart={cart} customer={customer} />
          </PaymentWrapper>
        </div>
      </div>
      <div className={contentStyles.secondary}>
        <div className={`${contentStyles.contentBlock}`}>
          <CheckoutSummary cart={cart} />
        </div>
      </div>
    </div>
  )
}
