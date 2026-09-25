import type { ReactNode } from "react"

import type { CloudinaryImage } from "@/types/datocms"

/**
 * The PDP's view model — what the buy box renders, assembled server-side from
 * DatoCMS content, the checkout catalog, and a display-only Stripe read of any
 * sale Price in play.
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
  /**
   * The amount the buyer pays, in minor units (cents): the sale amount while a
   * sale is running, otherwise the catalog's regular amount.
   */
  unitAmount: number
  /** The regular amount to strike through while a sale runs; null otherwise. */
  compareAtAmount: number | null
  /** Renders a quantity control, from the product's `quantity_bearing`. */
  quantityBearing: boolean
  /** Sold-out lines render disabled and labelled, never hidden. */
  inStock: boolean
}

/** How the buy box selects its primary — the page's `product_type`. */
export type PdpProductType = "simple" | "variation" | "grouped"

/**
 * A `product_tab` block's `tab` value, narrowed to the four the enum allows.
 *
 * Only `description` changes behaviour: it is the panel whose body falls back to
 * the primary product's copy when the block carries none of its own
 * (`docs/pdp-to-minicart-to-checkout-spec.md` § 5.6).
 */
export type PdpPanelKind = "description" | "includes" | "goodToKnow" | "other"

/**
 * One below-fold panel, already rendered.
 *
 * The body arrives as a React node rather than as CMS data: the panel bodies are
 * static content, so the server renders them — with the same `StructuredText`
 * switch the page bodies use — and only the tab strip is interactive.
 */
export type PdpPanel = {
  /** The block's record id, which is also the tabs wrapper's `value`. */
  id: string
  kind: PdpPanelKind
  /** The block's `title`, which is the section heading or the tab's label. */
  title: string
  /** The rendered body. A panel is only built when it has something to show. */
  content: ReactNode
}

/**
 * The buy box's meta line, resolved server-side so the client never formats a
 * date (a locale or timezone differing between server and browser would hydrate
 * mismatched). `null` when the page sets neither half.
 */
export type PdpEventMeta = {
  /** The start date, formatted in club-local time (`America/New_York`). */
  date: string | null
  location: string | null
}

/** Everything one PDP renders. */
export type PdpViewModel = {
  slug: string
  title: string
  /**
   * The page's tagline, shown under the title.
   *
   * Rendered on the server rather than passed as CMS data: it is Structured Text
   * (§ 4.1), and only the tab strip and buy box need to be interactive.
   */
  shortDescription: ReactNode | null
  /** The buy box's date / location line, or `null` when neither is set. */
  event: PdpEventMeta | null
  productType: PdpProductType
  photos: PdpPhoto[]
  primaries: PdpLine[]
  addons: PdpLine[]
  /** The authored below-fold panels, in the order the editor arranged them. */
  panels: PdpPanel[]
  /** The DatoCMS `data_collector` record id snapshotted onto the entries. */
  collectorRef: string
  /** The collector's field definitions, snapshotted at add-time. */
  fields: import("@/lib/checkout/cart-entries").CollectorField[]
}
