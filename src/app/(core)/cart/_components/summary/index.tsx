import Heading from "@/components/typography/heading"
import Button from "@/components/button"
import Link from "@/components/link"
import CartTotals from "@modules/common/components/cart-totals"
import DiscountCode from "@/components/checkout/discount-code"
import type { HttpTypes } from "@medusajs/types"

import s from "./styles.module.css"

type SummaryProps = {
  cart: HttpTypes.StoreCart & {
    promotions: HttpTypes.StorePromotion[]
  }
}

function getCheckoutStep(cart: HttpTypes.StoreCart) {
  if (!cart?.shipping_address?.address_1 || !cart.email) {
    return "address"
  } else if (cart?.shipping_methods?.length === 0) {
    return "delivery"
  } else {
    return "payment"
  }
}

export default function CartSummary({ cart }: SummaryProps) {
  const step = getCheckoutStep(cart)

  return (
    <div className={s.cartSummary}>
      {cart && cart.region && (
        <>
          <Heading level="h2">Summary</Heading>
          <DiscountCode cart={cart} />
          <CartTotals totals={cart} />
          <Link href={"/checkout?step=" + step} data-testid="checkout-button">
            <Button className="w-full h-10">Go to checkout</Button>
          </Link>
        </>
      )}
    </div>
  )
}
