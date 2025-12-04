import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { Metadata } from "next"
import { notFound } from "next/navigation"
import Heading from "@/components/typography/heading"
import CartTable from "./_components/table"
import CartSummary from "./_components/summary"
import EmptyCartMessage from "@modules/cart//components/empty-cart-message"
// import SignInPrompt from "@modules/cart/components/sign-in-prompt"
// import Divider from "@modules/common/components/divider"

import contentStyles from "@/styles/content.module.css"
import s from "./styles.module.css"

export const metadata: Metadata = {
  title: "Cart",
  description: "View your cart",
}

export default async function Cart() {
  const cart = await retrieveCart().catch((error) => {
    console.error(error)
    return notFound()
  })

  const customer = await retrieveCustomer()

  // Show empty cart message if cart is null or has no items
  if (!cart || cart.items?.length === 0) {
    return (
      <div className={`${contentStyles.contentMain} ${s.emptyCart}`}>
        <Heading level="h1">Your Cart</Heading>
        <EmptyCartMessage />
      </div>
    )
  }

  return (
    <div className={s.cartPage}>
      <div className={s.primary}>
        <div
          className={`${contentStyles.contentMain} ${s.cartContent}`}
          data-testid="cart-container"
        >
          <Heading level="h1">Your Cart</Heading>
          {/* {!customer && (
              <>
                <SignInPrompt />
                <Divider />
              </>
            )} */}
          <CartTable cart={cart ?? undefined} />
        </div>
      </div>
      <CartSummary cart={cart as any} />
    </div>
  )
}
