"use client"

import { updateLineItem } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import Link from "@components/link"
import Image from "next/image"
import Text from "@/components/typography/text"
import UnitPrice from "./_components/unit-price"
import QuantitySelector from "@/components/quantity-selector"
import RemoveItem from "./_components/remove-item"
import TotalPrice from "./_components/total-price"
import ErrorMessage from "@modules/checkout/components/error-message"
import Spinner from "@modules/common/icons/spinner"
import PlaceholderImage from "@/svg/PlaceholderImage"
import { useState } from "react"

import s from "./styles.module.css"

type MetadataItem = {
  displayName: string
  value: string
}

type ItemProps = {
  item: HttpTypes.StoreCartLineItem
  index: number
  currencyCode: string
}

export default function CartLineItem({ item, index, currencyCode }: ItemProps) {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const changeQuantity = async (quantity: number) => {
    setError(null)
    setUpdating(true)

    await updateLineItem({
      lineId: item.id,
      quantity,
    })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => {
        setUpdating(false)
      })
  }

  console.log("ITEM", item)

  // TODO: Update this to grab the actual max inventory
  const maxQtyFromInventory = 10
  const maxQuantity = item.variant?.manage_inventory ? 10 : maxQtyFromInventory
  /**
   * Determines the product image URL for the cart line item.
   * Checks variant product images first, then falls back to product images.
   * @TODO: Consider supporting multiple images or fallback logic for future optimizations.
   */
  const productImgUrl =
    item.variant?.product?.images?.[0]?.url ??
    item.product?.images?.[0]?.url ??
    null

  return (
    <tr>
      <td>
        <div className={s.itemInfo}>
          <Link href={`/product/${item.product_handle}`}>
            {productImgUrl ? (
              <>
                <Image
                  src={productImgUrl || ""}
                  alt={item.product_title || "Product image"}
                  width={100}
                  height={100}
                  className={s.itemImg}
                />
              </>
            ) : (
              <div className={s.placeholderImg}>
                <PlaceholderImage size={30} />
              </div>
            )}
          </Link>
          <div className="">
            <Link
              href={`/product/${item.product_handle}`}
              className={s.itemTitle}
            >
              {item.product_title}
            </Link>
            {item.variant?.title &&
              !item.variant.title.toLowerCase().includes("default") && (
                <Text className={s.itemSubtitle}>{item.variant.title}</Text>
              )}
            {/* {JSON.stringify(item.metadata)} */}
            {item.metadata && (
              <ul className={s.metadataList}>
                {Object.keys(item.metadata).map((key) => {
                  const metaValue = item.metadata?.[key] as
                    | MetadataItem
                    | undefined
                  return (
                    <li key={key}>
                      {metaValue?.displayName}: {metaValue?.value}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </td>

      <td>
        <UnitPrice item={item} currencyCode={currencyCode} />
      </td>

      <td>
        <div className={s.quantity}>
          <QuantitySelector
            quantity={item.quantity || 1}
            setQuantity={changeQuantity}
            index={index}
            data-testid="product-select-button"
          />
          <div className={s.removeItemBtn}>
            <RemoveItem id={item.id} data-testid="product-delete-button">
              Remove
            </RemoveItem>
          </div>
        </div>
        {updating && <Spinner />}
        <ErrorMessage error={error} data-testid="product-error-message" />
      </td>

      <td className="">
        <span className="">
          <TotalPrice item={item} currencyCode={currencyCode} />
        </span>
      </td>
    </tr>
  )
}
