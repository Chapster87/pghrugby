import type { CloudinaryImage } from "@/types/datocms"

/**
 * The PDP's view model — what the buy box renders, assembled server-side from
 * DatoCMS content and the checkout catalog.
 *
 * Deliberately free of DatoCMS shapes and of any Stripe client: the layout is a
 * client component, and everything it needs (prices included) is resolved here
 * so the browser never holds a content or payment credential.
 */

/** One page-owned gallery item (a Cloudinary picker object per breakpoint). */
export type PdpPhoto = {
  id: string
  alt: string
  desktop: CloudinaryImage | null
  /** The art-directed mobile crop; falls back to `desktop` when absent. */
  mobile: CloudinaryImage | null
}

/** One buyable line in the buy box: a primary or an add-on. */
export type PdpLine = {
  /** The Stripe sku the line keys off — what the cart entry carries. */
  sku: string
  label: string
  /** A one-line qualifier under the name (the product's short description). */
  note: string | null
  /** Effective unit price in minor units (cents), resolved from the catalog. */
  unitAmount: number
  /** Renders a quantity control, from the product's `quantity_bearing`. */
  quantityBearing: boolean
  /** Sold-out lines render disabled and labelled, never hidden. */
  inStock: boolean
}

/** How the buy box selects its primary — the page's `product_type`. */
export type PdpProductType = "simple" | "variation" | "grouped"

/** Everything one PDP renders. */
export type PdpViewModel = {
  slug: string
  title: string
  /** The page's intro copy, shown under the title. */
  shortDescription: string | null
  /** The primary product's long copy, shown below the fold. */
  longDescription: string | null
  productType: PdpProductType
  photos: PdpPhoto[]
  primaries: PdpLine[]
  addons: PdpLine[]
  /** The DatoCMS `data_collector` record id snapshotted onto the entries. */
  collectorRef: string
  /** The collector's field definitions, snapshotted at add-time. */
  fields: import("@/lib/checkout/cart-entries").CollectorField[]
}
