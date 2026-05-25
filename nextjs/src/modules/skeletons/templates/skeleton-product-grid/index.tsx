import repeat from "@lib/util/repeat"
import SkeletonProductPreview from "@modules/skeletons/components/skeleton-product-preview"

import s from "./style.module.css"

const SkeletonProductGrid = ({
  numberOfProducts = 8,
}: {
  numberOfProducts?: number
}) => {
  return (
    <ul className={s.grid} data-testid="products-list-loader">
      {repeat(numberOfProducts).map((index) => (
        <li key={index}>
          <SkeletonProductPreview />
        </li>
      ))}
    </ul>
  )
}

export default SkeletonProductGrid
