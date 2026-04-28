import { StorePrice, StoreProductVariant } from "@medusajs/types"

export type SEO = {
  title?: string
  description?: string
  canonicalUrl?: string
  ogTitle?: string
  ogDescription?: string
  ogUrl?: string
  ogImage?: string
  twitterTitle?: string
  twitterDescription?: string
  twitterImage?: string
}

export type FeaturedProduct = {
  id: string
  title: string
  handle: string
  thumbnail?: string
}

export type VariantPrice = {
  calculated_price_number: number
  calculated_price: string
  original_price_number: number
  original_price: string
  currency_code: string
  price_type: string
  percentage_diff: string
}

export type StoreFreeShippingPrice = StorePrice & {
  target_reached: boolean
  target_remaining: number
  remaining_percentage: number
}

export type DigitalProduct = {
  id: string
  name: string
  medias?: DigitalProductMedia[]
}

export type DigitalProductMedia = {
  id: string
  fileId: string
  type: "preview" | "main"
  mimeType: string
  digitalProduct?: DigitalProduct[]
}

export type DigitalProductPreview = DigitalProductMedia & {
  url: string
}

export type VariantWithDigitalProduct = StoreProductVariant & {
  digital_product?: DigitalProduct
}
