import { Table } from "@medusajs/ui"

import s from "./style.module.css"

const SkeletonCartItem = () => {
  return (
    <Table.Row className={s.itemRow}>
      <Table.Cell className={s.thumbnailCell}>
        <div className={s.thumbnail} />
      </Table.Cell>
      <Table.Cell className={s.infoCell}>
        <div className={s.infoWrapper}>
          <div className={s.titleSkeleton} />
          <div className={s.subtitleSkeleton} />
        </div>
      </Table.Cell>
      <Table.Cell>
        <div className={s.quantityWrapper}>
          <div className={s.quantitySkeleton} />
          <div className={s.selectSkeleton} />
        </div>
      </Table.Cell>
      <Table.Cell>
        <div className={s.unitPriceWrapper}>
          <div className={s.priceSkeleton} />
        </div>
      </Table.Cell>
      <Table.Cell className={s.totalPriceCell}>
        <div className={s.totalPriceWrapper}>
          <div className={s.priceSkeleton} />
        </div>
      </Table.Cell>
    </Table.Row>
  )
}

export default SkeletonCartItem
