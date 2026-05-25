import repeat from "@lib/util/repeat"
import SkeletonProductPreview from "@modules/skeletons/components/skeleton-product-preview"

import s from "./style.module.css"

const SkeletonRelatedProducts = () => {
  return (
    <div className={s.container}>
      <div className={s.header}>
        <div className={s.titleSkeleton}></div>
        <div className={s.subtitleWrapper}>
          <div className={s.subtitleSkeletonLarge}></div>
          <div className={s.subtitleSkeletonSmall}></div>
        </div>
      </div>
      <ul className={s.grid}>
        {repeat(3).map((index) => (
          <li key={index}>
            <SkeletonProductPreview />
          </li>
        ))}
      </ul>
    </div>
  )
}

export default SkeletonRelatedProducts
