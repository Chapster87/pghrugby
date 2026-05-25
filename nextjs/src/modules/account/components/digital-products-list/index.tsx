import Heading from "@/components/typography/heading"
import Text from "@/components/typography/text"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Button } from "@medusajs/ui"

import s from "./style.module.css"

const DigitalProductsList = () => {
  return (
    <div className={s.digitalProductsWrapper}>
      <div className={s.header}>
        <Heading level="h2">Digital Products</Heading>
        <Text>View and download your digital purchases.</Text>
      </div>
      <div className={s.emptyState}>
        <Heading level="h3" display="h6">
          No digital products found
        </Heading>
        <Text>You haven't purchased any digital products yet.</Text>
        <div style={{ marginTop: "16px" }}>
          <LocalizedClientLink href="/store">
            <Button>Go to store</Button>
          </LocalizedClientLink>
        </div>
      </div>
    </div>
  )
}

export default DigitalProductsList
