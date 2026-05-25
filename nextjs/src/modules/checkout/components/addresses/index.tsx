"use client"

import { setAddresses } from "@lib/data/cart"
import compareAddresses from "@lib/util/compare-addresses"
import { CheckCircleSolid } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { useToggleState } from "@medusajs/ui"

import Heading from "@/components/typography/heading"
import Text from "@/components/typography/text"
import Divider from "@modules/common/components/divider"
import Spinner from "@modules/common/icons/spinner"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useActionState } from "react"
import BillingAddress from "../billing_address"
import ErrorMessage from "../error-message"
import ShippingAddress from "../shipping-address"
import { SubmitButton } from "../submit-button"

import s from "./style.module.css"

const Addresses = ({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "address"

  const { state: sameAsBilling, toggle: toggleSameAsBilling } = useToggleState(
    cart?.shipping_address && cart?.billing_address
      ? compareAddresses(cart?.shipping_address, cart?.billing_address)
      : true
  )

  const handleEdit = () => {
    router.push(pathname + "?step=address")
  }

  const [message, formAction] = useActionState(setAddresses, null)

  return (
    <div className={s.container}>
      <div className={s.header}>
        <Heading level="h2" className={s.heading}>
          Shipping Address
          {!isOpen && <CheckCircleSolid />}
        </Heading>
        {!isOpen && cart?.shipping_address && (
          <Text>
            <button
              onClick={handleEdit}
              className={s.editButton}
              data-testid="edit-address-button"
            >
              Edit
            </button>
          </Text>
        )}
      </div>
      {isOpen ? (
        <form action={formAction}>
          <div className={s.formContainer}>
            <ShippingAddress
              customer={customer}
              checked={sameAsBilling}
              onChange={toggleSameAsBilling}
              cart={cart}
            />

            {!sameAsBilling && (
              <div>
                <Heading level="h2" className={s.billingHeading}>
                  Billing address
                </Heading>

                <BillingAddress cart={cart} />
              </div>
            )}
            <SubmitButton
              className={s.submitButton}
              data-testid="submit-address-button"
            >
              Continue to delivery
            </SubmitButton>
            <ErrorMessage error={message} data-testid="address-error-message" />
          </div>
        </form>
      ) : (
        <div>
          <div className={s.summaryContainer}>
            {cart && cart.shipping_address ? (
              <div className={s.summaryContent}>
                <div className={s.summaryGrid}>
                  <div
                    className={s.summaryColumn}
                    data-testid="shipping-address-summary"
                  >
                    <Text className={s.summaryTitle}>Shipping Address</Text>
                    <Text className={s.summaryText}>
                      {cart.shipping_address.first_name}{" "}
                      {cart.shipping_address.last_name}
                    </Text>
                    <Text className={s.summaryText}>
                      {cart.shipping_address.address_1}{" "}
                      {cart.shipping_address.address_2}
                    </Text>
                    <Text className={s.summaryText}>
                      {cart.shipping_address.postal_code},{" "}
                      {cart.shipping_address.city}
                    </Text>
                    <Text className={s.summaryText}>
                      {cart.shipping_address.country_code?.toUpperCase()}
                    </Text>
                  </div>

                  <div
                    className={s.summaryColumn}
                    data-testid="shipping-contact-summary"
                  >
                    <Text className={s.summaryTitle}>Contact</Text>
                    <Text className={s.summaryText}>
                      {cart.shipping_address.phone}
                    </Text>
                    <Text className={s.summaryText}>{cart.email}</Text>
                  </div>

                  <div
                    className={s.summaryColumn}
                    data-testid="billing-address-summary"
                  >
                    <Text className={s.summaryTitle}>Billing Address</Text>

                    {sameAsBilling ? (
                      <Text className={s.summaryText}>
                        Billing- and delivery address are the same.
                      </Text>
                    ) : (
                      <>
                        <Text className={s.summaryText}>
                          {cart.billing_address?.first_name}{" "}
                          {cart.billing_address?.last_name}
                        </Text>
                        <Text className={s.summaryText}>
                          {cart.billing_address?.address_1}{" "}
                          {cart.billing_address?.address_2}
                        </Text>
                        <Text className={s.summaryText}>
                          {cart.billing_address?.postal_code},{" "}
                          {cart.billing_address?.city}
                        </Text>
                        <Text className={s.summaryText}>
                          {cart.billing_address?.country_code?.toUpperCase()}
                        </Text>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <Spinner />
              </div>
            )}
          </div>
        </div>
      )}
      <Divider className={s.divider} />
    </div>
  )
}

export default Addresses
