import { Button } from "@medusajs/ui"
import { useMemo } from "react"

import Thumbnail from "@modules/products/components/thumbnail"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Heading from "@/components/typography/heading"
import Text from "@/components/typography/text"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

import s from "./style.module.css"

type OrderCardProps = {
  order: HttpTypes.StoreOrder
}

const OrderCard = ({ order }: OrderCardProps) => {
  const numberOfLines = useMemo(() => {
    return (
      order.items?.reduce((acc, item) => {
        return acc + item.quantity
      }, 0) ?? 0
    )
  }, [order])

  const numberOfProducts = useMemo(() => {
    return order.items?.length ?? 0
  }, [order])

  return (
    <div className={s.orderCard} data-testid="order-card">
      <Heading level="h3" display="h6" className={s.detailLabel}>
        #<span data-testid="order-display-id">{order.display_id}</span>
      </Heading>
      <div className={s.orderHeader}>
        <div className={s.orderDetails}>
          <div className={s.detailItem}>
            <Text size="sm" className={s.detailLabel}>
              Date placed
            </Text>
            <Text data-testid="order-created-at">
              {new Date(order.created_at).toDateString()}
            </Text>
          </div>
          <div className={s.detailItem}>
            <Text size="sm" className={s.detailLabel}>
              Total amount
            </Text>
            <Text data-testid="order-amount">
              {convertToLocale({
                amount: order.total,
                currency_code: order.currency_code,
              })}
            </Text>
          </div>
          <div className={s.detailItem}>
            <Text size="sm" className={s.detailLabel}>
              Quantity
            </Text>
            <Text>{`${numberOfLines} ${
              numberOfLines > 1 ? "items" : "item"
            }`}</Text>
          </div>
        </div>
      </div>
      <div className={s.thumbnailGrid}>
        {order.items?.slice(0, 3).map((i) => {
          return (
            <div key={i.id} className={s.detailItem} data-testid="order-item">
              <Thumbnail thumbnail={i.thumbnail} images={[]} size="full" />
              <div className={s.orderHeader}>
                <Text
                  size="sm"
                  className="font-semibold"
                  data-testid="item-title"
                >
                  {i.title}
                </Text>
                <Text variant="span" size="sm" style={{ marginLeft: "8px" }}>
                  x {i.quantity}
                </Text>
              </div>
            </div>
          )
        })}
        {numberOfProducts > 4 && (
          <div
            className={s.detailItem}
            style={{ alignItems: "center", justifyContent: "center" }}
          >
            <Text size="sm">+ {numberOfLines - 4}</Text>
            <Text size="sm">more</Text>
          </div>
        )}
      </div>
      <div
        className="flex justify-end"
        style={{ display: "flex", justifyContent: "flex-end" }}
      >
        <LocalizedClientLink href={`/account/orders/details/${order.id}`}>
          <Button data-testid="order-details-link" variant="secondary">
            See details
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default OrderCard
