import { Table } from "@medusajs/ui"

import repeat from "@lib/util/repeat"
import SkeletonCartItem from "@modules/skeletons/components/skeleton-cart-item"
import SkeletonCodeForm from "@modules/skeletons/components/skeleton-code-form"
import SkeletonOrderSummary from "@modules/skeletons/components/skeleton-order-summary"

import s from "./style.module.css"

const SkeletonCartPage = () => {
  return (
    <div className={s.pageContainer}>
      <div className={s.innerContainer}>
        <div className={s.layout}>
          <div className={s.itemsSection}>
            <div className={s.headerRow}>
              <div className={s.headerInfo}>
                <div className={s.titleSkeleton} />
                <div className={s.subtitleSkeleton} />
              </div>
              <div>
                <div className={s.countSkeleton} />
              </div>
            </div>
            <div>
              <div className={s.tableTitleWrapper}>
                <div className={s.tableTitleSkeleton} />
              </div>
              <Table>
                <Table.Header className={s.tableHeader}>
                  <Table.Row>
                    <Table.HeaderCell className={s.tableHeaderCellLeft}>
                      <div className={s.headerCellSkeletonTiny} />
                    </Table.HeaderCell>
                    <Table.HeaderCell></Table.HeaderCell>
                    <Table.HeaderCell>
                      <div className={s.headerCellSkeletonSmall} />
                    </Table.HeaderCell>
                    <Table.HeaderCell>
                      <div className={s.headerCellSkeletonXSmall} />
                    </Table.HeaderCell>
                    <Table.HeaderCell className={s.tableHeaderCellRight}>
                      <div className={s.headerCellContentRight}>
                        <div className={s.headerCellSkeletonXSmall} />
                      </div>
                    </Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {repeat(4).map((index) => (
                    <SkeletonCartItem key={index} />
                  ))}
                </Table.Body>
              </Table>
            </div>
          </div>
          <div className={s.sidebar}>
            <SkeletonOrderSummary />
            <SkeletonCodeForm />
          </div>
        </div>
      </div>
    </div>
  )
}

export default SkeletonCartPage
