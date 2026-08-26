"use client"

import { HttpTypes } from "@medusajs/types"
import Button from "@/components/button"
import Divider from "@modules/common/components/divider"
import OptionSelect from "@modules/products/components/product-actions/option-select"
import { isEqual } from "lodash"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import ProductPrice from "../product-price"
import ProductForm from "@modules/products/components/product-form"
import { VariantWithDigitalProduct } from "../../../../types/global"
import { getDigitalProductPreview } from "../../../../lib/data/products"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
}

const optionsAsKeymap = (
  variantOptions: HttpTypes.StoreProductVariant["options"]
) => {
  return variantOptions?.reduce((acc: Record<string, string>, varopt: any) => {
    acc[varopt.option_id] = varopt.value
    return acc
  }, {})
}

export default function ProductActions({
  product,
  disabled,
}: ProductActionsProps) {
  const router = useRouter()
  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [meta, setMeta] = useState<Record<string, any>>({})
  const [formValid, setFormValid] = useState(true)

  // If there is only 1 variant, preselect the options
  useEffect(() => {
    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
    }
  }, [product.variants])

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options]) as VariantWithDigitalProduct | undefined

  // update the options when a variant is selected
  const setOptionValue = (optionId: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [optionId]: value,
    }))
  }

  const actionsRef = useRef<HTMLDivElement>(null)

  interface HandleChangeEvent extends React.ChangeEvent<HTMLInputElement> {}

  const handleChange = (e: HandleChangeEvent) => {
    setMeta({
      ...meta,
      [e.target.name]: { displayName: e.target.title, value: e.target.value },
    })
  }

  const handleDownloadPreview = async () => {
    if (!selectedVariant?.digital_product) {
      return
    }

    const downloadUrl = await getDigitalProductPreview({
      id: selectedVariant?.digital_product.id,
    })

    if (downloadUrl.length) {
      window.open(downloadUrl)
    }
  }

  // The Medusa cart is gone — orders now flow through the Stripe-backed cart
  // and embedded Checkout. This page (demo merch catalog) renders as a product
  // info page and points buyers at the store cart.
  const goToCart = () => {
    router.push("/cart")
  }

  return (
    <>
      <div className="flex flex-col gap-y-2" ref={actionsRef}>
        <div>
          {(product.variants?.length ?? 0) > 1 && (
            <div className="flex flex-col gap-y-4">
              {(product.options || []).map((option) => {
                return (
                  <div key={option.id}>
                    <OptionSelect
                      option={option}
                      current={options[option.id]}
                      updateOption={setOptionValue}
                      title={option.title ?? ""}
                      data-testid="product-options"
                      disabled={!!disabled}
                    />
                  </div>
                )
              })}
              <Divider />
            </div>
          )}
        </div>
        <ProductPrice product={product} variant={selectedVariant} />

        <ProductForm
          productId={product.id}
          meta={meta}
          changeForm={handleChange}
          setFormValid={setFormValid}
        />

        {selectedVariant?.digital_product && (
          <Button
            onClick={handleDownloadPreview}
            variant="secondary"
            className="w-full h-10"
          >
            Download Preview
          </Button>
        )}

        <Button
          onClick={goToCart}
          variant="primary"
          className="w-full h-10"
          data-testid="add-product-button"
        >
          Order at the club store →
        </Button>
      </div>
    </>
  )
}
