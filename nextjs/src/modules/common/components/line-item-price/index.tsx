import { getPercentageDiff } from "@lib/util/get-precentage-diff"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import s from "./style.module.css"

type LineItemPriceProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  style?: "default" | "tight"
  currencyCode: string
}

const LineItemPrice = ({
  item,
  style = "default",
  currencyCode,
}: LineItemPriceProps) => {
  const { total, original_total } = item
  const originalPrice = original_total || 0
  const currentPrice = total || 0
  const hasReducedPrice = currentPrice < originalPrice

  return (
    <div className={s.wrapper}>
      <div className={s.priceContainer}>
        {hasReducedPrice && (
          <>
            <p>
              {style === "default" && (
                <span className={s.originalPriceText}>Original: </span>
              )}
              <span
                className={s.originalPriceValue}
                data-testid="product-original-price"
              >
                {convertToLocale({
                  amount: originalPrice,
                  currency_code: currencyCode,
                })}
              </span>
            </p>
            {style === "default" && (
              <span className={s.discountPercentage}>
                -{getPercentageDiff(originalPrice, currentPrice || 0)}%
              </span>
            )}
          </>
        )}
        <span
          className={hasReducedPrice ? s.currentPrice : s.currentPriceDefault}
          data-testid="product-price"
        >
          {convertToLocale({
            amount: currentPrice,
            currency_code: currencyCode,
          })}
        </span>
      </div>
    </div>
  )
}

export default LineItemPrice
