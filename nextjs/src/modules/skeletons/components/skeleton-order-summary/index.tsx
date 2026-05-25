import SkeletonButton from "@modules/skeletons/components/skeleton-button"
import SkeletonCartTotals from "@modules/skeletons/components/skeleton-cart-totals"

import s from "./style.module.css"

const SkeletonOrderSummary = () => {
  return (
    <div className={s.container}>
      <SkeletonCartTotals header={false} />
      <div className={s.buttonWrapper}>
        <SkeletonButton />
      </div>
    </div>
  )
}

export default SkeletonOrderSummary
