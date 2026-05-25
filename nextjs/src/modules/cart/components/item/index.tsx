"use client"

import { Table } from "@medusajs/ui"
import Text from "@/components/typography/text"
import { HttpTypes } from "@medusajs/types"
import LineItemPrice from "@modules/common/components/line-item-price"
import LineItemUnitPrice from "@modules/common/components/line-item-unit-price"
import Thumbnail from "@modules/products/components/thumbnail"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import DeleteButton from "@modules/common/components/delete-button"
import CartItemSelect from "@modules/cart/components/cart-item-select"
import { updateLineItem } from "@lib/data/cart"
import { useState } from "react"
import ErrorMessage from "@modules/checkout/components/error-message"
import clsx from "clsx"

import s from "./style.module.css"

type ItemProps = {
  item: HttpTypes.StoreCartLineItem
  type?: "full" | "preview"
  currencyCode: string
}

const Item = ({ item, type = "full", currencyCode }: ItemProps) => {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const changeQuantity = async (quantity: number) => {
    setError(null)
    setUpdating(true)

    const message = await updateLineItem({
      lineId: item.id,
      quantity,
    })
      .catch((err) => {
        return err.message
      })
      .finally(() => {
        setUpdating(false)
      })

    message && setError(message)
  }

  return (
    <Table.Row className={s.itemRow} data-testid="product-row">
      <Table.Cell className={s.thumbnailCell}>
        <LocalizedClientLink
          href={`/products/${item.variant?.product?.handle}`}
          className={s.thumbnailWrapper}
        >
          <Thumbnail thumbnail={item.thumbnail} size="square" />
        </LocalizedClientLink>
      </Table.Cell>

      <Table.Cell className={s.titleCell}>
        <Text className={s.productTitle} data-testid="product-title">
          {item.title}
        </Text>
        <Text variant="span" size="sm" className="text-ui-fg-subtle">
          {item.variant?.title}
        </Text>
      </Table.Cell>

      {type === "full" && (
        <Table.Cell>
          <div className={s.quantityWrapper}>
            <DeleteButton id={item.id} data-testid="product-delete-button" />
            <CartItemSelect
              value={item.quantity}
              onChange={(value) => changeQuantity(parseInt(value.target.value))}
              className={s.quantitySelect}
              data-testid="product-select-button"
            >
              {Array.from(
                {
                  length: Math.min(item.variant?.inventory_quantity || 0, 10),
                },
                (_, i) => (
                  <option value={i + 1} key={i}>
                    {i + 1}
                  </option>
                )
              )}
            </CartItemSelect>
            {updating && <Text variant="span">...</Text>}
          </div>
          <ErrorMessage error={error} data-testid="product-error-message" />
        </Table.Cell>
      )}

      {type === "full" && (
        <Table.Cell className={s.desktopPriceCell}>
          <LineItemUnitPrice
            item={item}
            style="stacked"
            currencyCode={currencyCode}
          />
        </Table.Cell>
      )}

      <Table.Cell className={s.totalPriceCell}>
        <span className={clsx({ [s.updating]: updating })}>
          {type === "preview" && (
            <span className={s.previewQuantity}>
              <Text variant="span" className="text-ui-fg-muted">
                {item.quantity}x{" "}
              </Text>
              <LineItemUnitPrice
                item={item}
                style="tight"
                currencyCode={currencyCode}
              />
            </span>
          )}
          <LineItemPrice
            item={item}
            style="stacked"
            currencyCode={currencyCode}
          />
        </span>
      </Table.Cell>
    </Table.Row>
  )
}

export default Item
