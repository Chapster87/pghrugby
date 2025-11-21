import Link from "@components/link"
import Heading from "@components/typography/heading"
import { HttpTypes } from "@medusajs/types"

type ProductInfoProps = {
  product: HttpTypes.StoreProduct
  productData?: {
    title?: string
  }
}

export default function ProductName({
  product,
  productData,
}: ProductInfoProps) {
  return (
    <>
      {product.collection && (
        <Link href={`/collections/${product.collection.handle}`}>
          {product.collection.title}
        </Link>
      )}
      <Heading level="h1">
        {productData?.title || product.title || "Product Name"}
      </Heading>
    </>
  )
}
