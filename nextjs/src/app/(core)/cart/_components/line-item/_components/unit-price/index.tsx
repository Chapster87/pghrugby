import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import clsx from "clsx"
import Text from "@/components/typography/text"
import pricingStyles from "@/styles/components/pricing.module.css"
import s from "./styles.module.css"

type UnitPriceProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  currencyCode: string
}

export default function UnitPrice({ item, currencyCode }: UnitPriceProps) {
  const { total = 0, original_total = 0 } = item
  const hasReducedPrice = total < original_total

  const percentage_diff =
    original_total > 0
      ? Math.round(((original_total - total) / original_total) * 100)
      : 0

  return (
    <div className={s.unitPrice}>
      {hasReducedPrice && (
        <Text className={pricingStyles.originalPrice}>
          <span
            className={pricingStyles.priceStrikethrough}
            data-testid="product-unit-original-price"
          >
            {convertToLocale({
              amount: original_total / item.quantity,
              currency_code: currencyCode,
            })}
          </span>
        </Text>
      )}
      <span
        className={`${pricingStyles.salePrice} ${clsx({
          [pricingStyles.hasReducedPrice]: hasReducedPrice,
        })}`}
        data-testid="product-unit-price"
      >
        {convertToLocale({
          amount: total / item.quantity,
          currency_code: currencyCode,
        })}
      </span>
    </div>
  )
}
