import React from "react"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Heading from "@/components/typography/heading"
import Text from "@/components/typography/text"
import contentStyles from "@/styles/content.module.css"

import AccountNav from "../components/account-nav"
import s from "./style.module.css"

interface AccountLayoutProps {
  customer: HttpTypes.StoreCustomer | null
  children: React.ReactNode
}

const AccountLayout: React.FC<AccountLayoutProps> = ({
  customer,
  children,
}) => {
  return (
    <div className={s.layoutWrapper} data-testid="account-page">
      <div className={`${contentStyles.siteContainer} ${s.container}`}>
        <div className={s.grid}>
          <div>{customer && <AccountNav customer={customer} />}</div>
          <div className={s.content}>{children}</div>
        </div>
        <div className={s.footer}>
          <div>
            <Heading level="h3" className={s.footerTitle}>
              Got questions?
            </Heading>
            <Text>
              You can find frequently asked questions and answers on our
              customer service page.
            </Text>
          </div>
          <div>
            <LocalizedClientLink href="/contact">
              <Text className="underline">Customer Service</Text>
            </LocalizedClientLink>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountLayout
