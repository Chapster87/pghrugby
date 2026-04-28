import repeat from "@lib/util/repeat"
import { HttpTypes } from "@medusajs/types"

import CartLineItem from "../line-item"
import SkeletonLineItem from "../skeleton-line-item"

import s from "./styles.module.css"

type ItemsTemplateProps = {
  cart?: HttpTypes.StoreCart
}

export default function CartTable({ cart }: ItemsTemplateProps) {
  const items = cart?.items
  return (
    <div>
      <table className={s.cartTable}>
        <thead>
          <tr>
            <th className={s.thItem}>Item</th>
            <th className={s.thPrice}>Price</th>
            <th className={s.thQuantity}>Quantity</th>
            <th className={s.thTotal}>Total</th>
          </tr>
        </thead>
        <tbody>
          {items
            ? items
                .sort((a, b) => {
                  return (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
                })
                .map((item, index) => {
                  return (
                    <>
                      <CartLineItem
                        key={item.id}
                        index={index}
                        item={item}
                        currencyCode={cart?.currency_code}
                      />
                    </>
                  )
                })
            : repeat(5).map((i) => {
                return <SkeletonLineItem key={i} />
              })}
        </tbody>
      </table>
    </div>
  )
}
