"use client"

import { clx } from "@medusajs/ui"

import Heading from "@/components/typography/heading"
import Text from "@/components/typography/text"
import PaymentButton from "../payment-button"
import { useSearchParams } from "next/navigation"

import s from "./style.module.css"

const Review = ({ cart }: { cart: any }) => {
  const searchParams = useSearchParams()

  const isOpen = searchParams.get("step") === "review"

  const paidByGiftcard =
    cart?.gift_cards && cart?.gift_cards?.length > 0 && cart?.total === 0

  const previousStepsCompleted =
    cart.shipping_address &&
    cart.shipping_methods.length > 0 &&
    (cart.payment_collection || paidByGiftcard)

  return (
    <div className={s.container}>
      <div className={s.header}>
        <Heading
          level="h2"
          className={clx(s.heading, {
            [s.headingDisabled]: !isOpen,
          })}
        >
          Review
        </Heading>
      </div>
      {isOpen && previousStepsCompleted && (
        <>
          <div className={s.termsWrapper}>
            <div className="w-full">
              <Text className={s.termsText}>
                By clicking the Place Order button, you confirm that you have
                read, understand and accept our Terms of Use, Terms of Sale and
                Returns Policy and acknowledge that you have read Medusa Store's
                Privacy Policy.
              </Text>
            </div>
          </div>
          <PaymentButton cart={cart} data-testid="submit-order-button" />
        </>
      )}
    </div>
  )
}

export default Review
