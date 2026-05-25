import { Container } from "@medusajs/ui"

import ChevronDown from "@modules/common/icons/chevron-down"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Heading from "@/components/typography/heading"
import Text from "@/components/typography/text"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

import s from "./style.module.css"

type OverviewProps = {
  customer: HttpTypes.StoreCustomer | null
  orders: HttpTypes.StoreOrder[] | null
}

const Overview = ({ customer, orders }: OverviewProps) => {
  return (
    <div className={s.overviewWrapper} data-testid="overview-page-wrapper">
      <div className={s.header}>
        <Heading level="h2">
          <span data-testid="welcome-message" data-value={customer?.first_name}>
            Hello {customer?.first_name}
          </span>
        </Heading>
        <Text>
          Signed in as:{" "}
          <span
            className="font-semibold"
            data-testid="customer-email"
            data-value={customer?.email}
          >
            {customer?.email}
          </span>
        </Text>
      </div>

      <div className={s.statsGrid}>
        <div className={s.statItem}>
          <Heading level="h3" display="h6">
            Profile
          </Heading>
          <div className={s.statContent}>
            <Heading
              level="h2"
              data-testid="customer-profile-completion"
              data-value={getProfileCompletion(customer)}
            >
              {getProfileCompletion(customer)}%
            </Heading>
            <Text size="sm" className="uppercase">
              Completed
            </Text>
          </div>
        </div>

        <div className={s.statItem}>
          <Heading level="h3" display="h6">
            Addresses
          </Heading>
          <div className={s.statContent}>
            <Heading
              level="h2"
              data-testid="addresses-count"
              data-value={customer?.addresses?.length || 0}
            >
              {customer?.addresses?.length || 0}
            </Heading>
            <Text size="sm" className="uppercase">
              Saved
            </Text>
          </div>
        </div>

        <div className={s.orderSection}>
          <Heading level="h3" display="h6">
            Recent orders
          </Heading>
          <ul className={s.statContent} data-testid="orders-wrapper">
            {orders && orders.length > 0 ? (
              orders.slice(0, 5).map((order) => {
                return (
                  <li
                    key={order.id}
                    data-testid="order-wrapper"
                    data-value={order.id}
                  >
                    <LocalizedClientLink
                      href={`/account/orders/details/${order.id}`}
                    >
                      <Container className="bg-gray-50 flex justify-between items-center p-4">
                        <div className="grid grid-cols-3 grid-rows-2 gap-x-4 flex-1">
                          <Text variant="span" className="font-semibold">
                            Date placed
                          </Text>
                          <Text variant="span" className="font-semibold">
                            Order number
                          </Text>
                          <Text variant="span" className="font-semibold">
                            Total amount
                          </Text>
                          <Text variant="span" data-testid="order-created-date">
                            {new Date(order.created_at).toDateString()}
                          </Text>
                          <Text
                            variant="span"
                            data-testid="order-id"
                            data-value={order.display_id}
                          >
                            #{order.display_id}
                          </Text>
                          <Text variant="span" data-testid="order-amount">
                            {convertToLocale({
                              amount: order.total,
                              currency_code: order.currency_code,
                            })}
                          </Text>
                        </div>
                        <button
                          className="flex items-center justify-between"
                          data-testid="open-order-button"
                        >
                          <span className="sr-only">
                            Go to order #{order.display_id}
                          </span>
                          <ChevronDown className="-rotate-90" />
                        </button>
                      </Container>
                    </LocalizedClientLink>
                  </li>
                )
              })
            ) : (
              <Text data-testid="no-orders-message">No recent orders</Text>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}

const getProfileCompletion = (customer: HttpTypes.StoreCustomer | null) => {
  let count = 0

  if (!customer) {
    return 0
  }

  if (customer.email) {
    count++
  }

  if (customer.first_name && customer.last_name) {
    count++
  }

  if (customer.phone) {
    count++
  }

  const billingAddress = customer.addresses?.find(
    (addr) => addr.is_default_billing
  )

  if (billingAddress) {
    count++
  }

  return (count / 4) * 100
}

export default Overview
