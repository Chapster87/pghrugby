import SkeletonCartTotals from "@modules/skeletons/components/skeleton-cart-totals"

import s from "./style.module.css"

const SkeletonOrderInformation = () => {
  return (
    <div>
      <div className={s.section}>
        <div className={s.column}>
          <div className={s.titleSkeleton}></div>
          <div className={s.itemSkeletonSmall}></div>
          <div className={`${s.itemSkeletonMedium} ${s.marginSmall}`}></div>
          <div className={s.itemSkeletonTiny}></div>
        </div>
        <div className={s.column}>
          <div className={s.titleSkeleton}></div>
          <div className={s.itemSkeletonSmall}></div>
          <div className={`${s.itemSkeletonMedium} ${s.marginSmall}`}></div>
          <div className={s.itemSkeletonSmall}></div>
          <div className={`${s.itemSkeletonTiny} ${s.marginTopTiny}`}></div>
          <div className={`${s.titleSkeleton} ${s.marginMedium}`}></div>
          <div className={s.itemSkeletonTiny}></div>
        </div>
      </div>
      <div className={s.sectionNoBorder}>
        <div className={s.column}>
          <div className={s.titleSkeleton}></div>
          <div className={s.itemSkeletonSmall}></div>
          <div className={`${s.itemSkeletonMedium} ${s.marginMedium}`}></div>
        </div>

        <SkeletonCartTotals />
      </div>
    </div>
  )
}

export default SkeletonOrderInformation
