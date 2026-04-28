import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import clsx from "clsx"
import Text from "@/components/typography/text"
import pricingStyles from "@/styles/components/pricing.module.css"
import s from "./styles.module.css"

type LineItemPriceProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  currencyCode: string
}

export default function TotalPrice({ item, currencyCode }: LineItemPriceProps) {
  const { total, original_total } = item
  const originalPrice = original_total
  const currentPrice = total
  const hasReducedPrice =
    typeof originalPrice === "number" &&
    typeof currentPrice === "number" &&
    currentPrice < originalPrice

  return (
    <div className={s.totalPrice}>
      {hasReducedPrice && (
        <Text className={pricingStyles.originalPrice}>
          <span
            className={pricingStyles.priceStrikethrough}
            data-testid="product-original-price"
          >
            {convertToLocale({
              amount: originalPrice,
              currency_code: currencyCode,
            })}
          </span>
        </Text>
      )}
      <span
        className={`${pricingStyles.salePrice} ${clsx({
          [pricingStyles.hasReducedPrice]: hasReducedPrice,
        })}`}
        data-testid="product-price"
      >
        {convertToLocale({
          amount: currentPrice ?? 0,
          currency_code: currencyCode,
        })}
      </span>
    </div>
  )
}
