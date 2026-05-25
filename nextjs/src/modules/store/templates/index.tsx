import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import Heading from "@/components/typography/heading"
import PaginatedProducts from "./paginated-products"

import s from "./style.module.css"

const StoreTemplate = ({
  sortBy,
  page,
  countryCode,
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  return (
    <div className={s.container} data-testid="category-container">
      <RefinementList sortBy={sort} />
      <div className={s.productContent}>
        <div className={s.titleWrapper}>
          <Heading
            level="h1"
            className={s.title}
            data-testid="store-page-title"
          >
            All products
          </Heading>
        </div>
        <Suspense fallback={<SkeletonProductGrid />}>
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            countryCode={countryCode}
          />
        </Suspense>
      </div>
    </div>
  )
}

export default StoreTemplate
