"use client"

import { paymentInfoMap } from "@lib/constants"
import { initiatePaymentSession } from "@lib/data/cart"
import { CheckCircleSolid, CreditCard } from "@medusajs/icons"
import { Button, clx } from "@medusajs/ui"

import Heading from "@/components/typography/heading"
import Text from "@/components/typography/text"
import ErrorMessage from "@modules/checkout/components/error-message"
import { StripeContext } from "@modules/checkout/components/payment-wrapper/stripe-wrapper"
import Divider from "@modules/common/components/divider"
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { StripePaymentElementChangeEvent } from "@stripe/stripe-js"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useContext, useEffect, useState } from "react"

import s from "./style.module.css"

const Payment = ({
  cart,
  availablePaymentMethods,
}: {
  cart: any
  availablePaymentMethods: any[]
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stripeComplete, setStripeComplete] = useState(false)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>()

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "payment"

  const stripeReady = useContext(StripeContext)

  const activeSession = cart.payment_collection?.payment_sessions?.find(
    (paymentSession: any) => paymentSession.status === "pending"
  )
  const paidByGiftcard =
    cart?.gift_cards && cart?.gift_cards?.length > 0 && cart?.total === 0

  const paymentReady =
    (activeSession && cart?.shipping_methods.length !== 0) || paidByGiftcard

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams)
      params.set(name, value)

      return params.toString()
    },
    [searchParams]
  )

  const handleEdit = () => {
    router.push(pathname + "?" + createQueryString("step", "payment"), {
      scroll: false,
    })
  }

  const stripe = stripeReady ? useStripe() : null
  const elements = stripeReady ? useElements() : null

  const handlePaymentElementChange = async (
    event: StripePaymentElementChangeEvent
  ) => {
    if (event.value.type) {
      setSelectedPaymentMethod(event.value.type)
    }
    setStripeComplete(event.complete)

    if (event.complete) {
      setError(null)
    }
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (!stripe || !elements) {
        setError("Payment processing not ready. Please try again.")
        return
      }

      await elements.submit().catch((err) => {
        console.error(err)
        setError(err.message || "An error occurred with the payment")
        return
      })

      router.push(pathname + "?" + createQueryString("step", "review"), {
        scroll: false,
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const initStripe = async () => {
    try {
      await initiatePaymentSession(cart, {
        provider_id: "pp_stripe_stripe",
      })
    } catch (err) {
      console.error("Failed to initialize Stripe session:", err)
      setError("Failed to initialize payment. Please try again.")
    }
  }

  useEffect(() => {
    if (!activeSession && isOpen) {
      initStripe()
    }
  }, [cart, isOpen, activeSession])

  useEffect(() => {
    setError(null)
  }, [isOpen])

  return (
    <div className={s.container}>
      <div className={s.header}>
        <Heading
          level="h2"
          className={clx(s.heading, {
            [s.headingDisabled]: !isOpen && !paymentReady,
          })}
        >
          Payment
          {!isOpen && paymentReady && <CheckCircleSolid />}
        </Heading>
        {!isOpen && paymentReady && (
          <Text>
            <button
              onClick={handleEdit}
              className={s.editButton}
              data-testid="edit-payment-button"
            >
              Edit
            </button>
          </Text>
        )}
      </div>
      <div>
        <div style={{ display: isOpen ? "block" : "none" }}>
          {!paidByGiftcard &&
            availablePaymentMethods?.length &&
            stripeReady && (
              <div className={s.paymentElementWrapper}>
                <PaymentElement
                  onChange={handlePaymentElementChange}
                  options={{
                    layout: "accordion",
                  }}
                />
              </div>
            )}
          {paidByGiftcard && (
            <div className={s.summaryColumn}>
              <Text className={s.summaryTitle}>Payment method</Text>
              <Text
                className={s.summaryText}
                data-testid="payment-method-summary"
              >
                Gift card
              </Text>
            </div>
          )}

          <ErrorMessage
            error={error}
            data-testid="payment-method-error-message"
          />

          <Button
            size="large"
            className={s.submitButton}
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={
              !stripeComplete ||
              !stripe ||
              !elements ||
              (!selectedPaymentMethod && !paidByGiftcard)
            }
            data-testid="submit-payment-button"
          >
            Continue to review
          </Button>
        </div>

        <div style={{ display: isOpen ? "none" : "block" }}>
          {cart && paymentReady && activeSession && selectedPaymentMethod ? (
            <div className={s.summaryGrid}>
              <div className={s.summaryColumn}>
                <Text className={s.summaryTitle}>Payment method</Text>
                <Text
                  className={s.summaryText}
                  data-testid="payment-method-summary"
                >
                  {paymentInfoMap[selectedPaymentMethod]?.title ||
                    selectedPaymentMethod}
                </Text>
              </div>
              <div className={s.summaryColumn}>
                <Text className={s.summaryTitle}>Payment details</Text>
                <div
                  className={s.summaryDetail}
                  data-testid="payment-details-summary"
                >
                  <div className={s.iconWrapper}>
                    {paymentInfoMap[selectedPaymentMethod]?.icon || (
                      <CreditCard />
                    )}
                  </div>
                  <Text>Another step will appear</Text>
                </div>
              </div>
            </div>
          ) : paidByGiftcard ? (
            <div className={s.summaryColumn}>
              <Text className={s.summaryTitle}>Payment method</Text>
              <Text
                className={s.summaryText}
                data-testid="payment-method-summary"
              >
                Gift card
              </Text>
            </div>
          ) : null}
        </div>
      </div>
      <Divider className={s.divider} />
    </div>
  )
}

export default Payment
