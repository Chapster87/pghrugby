"use client"

import { Button } from "@medusajs/ui"
import OrderCard from "../order-card"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Heading from "@/components/typography/heading"
import Text from "@/components/typography/text"
import { HttpTypes } from "@medusajs/types"

import s from "./style.module.css"

const OrderOverview = ({ orders }: { orders: HttpTypes.StoreOrder[] }) => {
  if (orders?.length) {
    return (
      <div className={s.orderOverviewWrapper}>
        <div className={s.orderList}>
          {orders.map((o) => (
            <div
              key={o.id}
              style={{
                borderBottom: "1px solid var(--color-grey-200)",
                paddingBottom: "24px",
              }}
            >
              <OrderCard order={o} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={s.emptyState} data-testid="no-orders-container">
      <Heading level="h2" display="h6">
        Nothing to see here
      </Heading>
      <Text>You don't have any orders yet, let us change that {":)"}</Text>
      <div style={{ marginTop: "16px" }}>
        <LocalizedClientLink href="/" passHref>
          <Button data-testid="continue-shopping-button">
            Continue shopping
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default OrderOverview
