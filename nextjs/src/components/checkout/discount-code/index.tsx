"use client"

import { Badge, Heading, Input, Label, Text, Tooltip } from "@medusajs/ui"
import React, { useActionState } from "react"
import { applyPromotions, submitPromotionForm } from "@lib/data/cart"
import { convertToLocale } from "@lib/util/money"
import { InformationCircleSolid } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import Trash from "@modules/common/icons/trash"
import ErrorMessage from "../../../modules/checkout/components/error-message"
import { SubmitButton } from "../../../modules/checkout/components/submit-button"

import s from "./style.module.css"

type DiscountCodeProps = {
  cart: HttpTypes.StoreCart & {
    promotions: HttpTypes.StorePromotion[]
  }
}

const DiscountCode: React.FC<DiscountCodeProps> = ({ cart }) => {
  const [isOpen, setIsOpen] = React.useState(false)

  const { items = [], promotions = [] } = cart
  const removePromotionCode = async (code: string) => {
    const validPromotions = promotions.filter(
      (promotion) => promotion.code !== code
    )

    await applyPromotions(
      validPromotions.filter((p) => p.code === undefined).map((p) => p.code!)
    )
  }

  const addPromotionCode = async (formData: FormData) => {
    const code = formData.get("code")
    if (!code) {
      return
    }
    const input = document.getElementById("promotion-input") as HTMLInputElement
    const codes = promotions
      .filter((p) => p.code === undefined)
      .map((p) => p.code!)
    codes.push(code.toString())

    await applyPromotions(codes)

    if (input) {
      input.value = ""
    }
  }

  const [message, formAction] = useActionState(submitPromotionForm, null)

  return (
    <div className={s.wrapper}>
      <div className="txt-medium">
        <form action={(a) => addPromotionCode(a)} className={s.form}>
          <Label className={s.label}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className={s.button}
              data-testid="add-discount-button"
            >
              Add Promotion Code(s)
            </button>
          </Label>

          {isOpen && (
            <>
              <div className={s.inputWrapper}>
                <Input
                  className="size-full"
                  id="promotion-input"
                  name="code"
                  type="text"
                  autoFocus={false}
                  data-testid="discount-input"
                />
                <SubmitButton data-testid="discount-apply-button">
                  Apply
                </SubmitButton>
              </div>

              <ErrorMessage
                error={message}
                data-testid="discount-error-message"
              />
            </>
          )}
        </form>

        {promotions.length > 0 && (
          <div className={s.promotionsWrapper}>
            <div className={s.promotionsList}>
              <Heading className={s.promotionsHeading}>
                Promotion(s) applied:
              </Heading>

              {promotions.map((promotion) => {
                return (
                  <div
                    key={promotion.id}
                    className={s.promotionRow}
                    data-testid="discount-row"
                  >
                    <Text className={s.promotionText}>
                      <span
                        className={s.promotionCode}
                        data-testid="discount-code"
                      >
                        <Badge
                          color={promotion.is_automatic ? "green" : "grey"}
                          size="small"
                        >
                          {promotion.code}
                        </Badge>{" "}
                        (
                        {promotion.application_method?.value !== undefined &&
                          promotion.application_method.currency_code !==
                            undefined && (
                            <>
                              {promotion.application_method.type ===
                              "percentage"
                                ? `${promotion.application_method.value}%`
                                : convertToLocale({
                                    amount: Number(
                                      promotion.application_method.value
                                    ), // Explicitly cast to number
                                    currency_code:
                                      promotion.application_method
                                        .currency_code,
                                  })}
                            </>
                          )}
                        )
                      </span>
                    </Text>
                    {!promotion.is_automatic && (
                      <button
                        className={s.removeButton}
                        onClick={() => {
                          if (!promotion.code) {
                            return
                          }

                          removePromotionCode(promotion.code)
                        }}
                        data-testid="remove-discount-button"
                      >
                        <Trash size={14} />
                        <span className={s.srOnly}>
                          Remove discount code from order
                        </span>
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DiscountCode
