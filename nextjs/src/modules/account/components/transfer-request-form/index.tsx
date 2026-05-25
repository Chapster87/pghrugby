"use client"

import { useActionState, useState, useEffect } from "react"
import { createTransferRequest } from "@lib/data/orders"
import { IconButton, Input } from "@medusajs/ui"
import Heading from "@/components/typography/heading"
import Text from "@/components/typography/text"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import { CheckCircleMiniSolid, XCircleSolid } from "@medusajs/icons"

import s from "./style.module.css"

export default function TransferRequestForm() {
  const [showSuccess, setShowSuccess] = useState(false)

  const [state, formAction] = useActionState(createTransferRequest, {
    success: false,
    error: null,
    order: null,
  })

  useEffect(() => {
    if (state.success && state.order) {
      setShowSuccess(true)
    }
  }, [state.success, state.order])

  return (
    <div className={s.formWrapper}>
      <div className={s.formGrid}>
        <div className={s.textSection}>
          <Heading level="h3">Order transfers</Heading>
          <Text>
            Can't find the order you are looking for?
            <br /> Connect an order to your account.
          </Text>
        </div>
        <form action={formAction} className={s.formSection}>
          <div className={s.inputGroup}>
            <Input
              className="w-full"
              name="order_id"
              placeholder="Order ID"
              required
            />
            <SubmitButton variant="secondary" className={s.submitButton}>
              Request transfer
            </SubmitButton>
          </div>
        </form>
      </div>
      {!state.success && state.error && (
        <Text className={s.errorMessage}>{state.error}</Text>
      )}
      {showSuccess && (
        <div className={s.successMessage}>
          <div className={s.successInfo}>
            <CheckCircleMiniSolid className={`w-4 h-4 ${s.successIcon}`} />
            <div className={s.successText}>
              <Text className="font-semibold">
                Transfer for order {state.order?.id} requested
              </Text>
              <Text size="sm">
                Transfer request email sent to {state.order?.email}
              </Text>
            </div>
          </div>
          <IconButton
            variant="transparent"
            onClick={() => setShowSuccess(false)}
          >
            <XCircleSolid className="w-4 h-4" />
          </IconButton>
        </div>
      )}
    </div>
  )
}
