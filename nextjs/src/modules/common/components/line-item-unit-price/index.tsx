import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import s from "./style.module.css"

type LineItemUnitPriceProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  style?: "default" | "tight"
  currencyCode: string
}

const LineItemUnitPrice = ({
  item,
  style = "default",
  currencyCode,
}: LineItemUnitPriceProps) => {
  const { total, original_total } = item
  const safeTotal = total || 0
  const safeOriginalTotal = original_total || 0
  const hasReducedPrice = safeTotal < safeOriginalTotal

  const percentage_diff = Math.round(
    ((safeOriginalTotal - safeTotal) / safeOriginalTotal) * 100
  )

  return (
    <div className={s.wrapper}>
      {hasReducedPrice && (
        <>
          <p>
            {style === "default" && (
              <span className={s.originalPriceText}>Original: </span>
            )}
            <span
              className={s.originalPriceValue}
              data-testid="product-unit-original-price"
            >
              {convertToLocale({
                amount: safeOriginalTotal / item.quantity,
                currency_code: currencyCode,
              })}
            </span>
          </p>
          {style === "default" && (
            <span className={s.discountPercentage}>-{percentage_diff}%</span>
          )}
        </>
      )}
      <span
        className={hasReducedPrice ? s.currentPrice : s.currentPriceDefault}
        data-testid="product-unit-price"
      >
        {convertToLocale({
          amount: safeTotal / item.quantity,
          currency_code: currencyCode,
        })}
      </span>
    </div>
  )
}

export default LineItemUnitPrice
