import { graphql } from "@/lib/datocms/graphql"

/**
 * The PDP's content read.
 *
 * Reads the three curated buckets (primaries / add-ons / data collectors), the
 * page-owned gallery, and the page's `product_type`. Product fields carry the
 * two commerce flags the buy box renders on — `inStock` (sold-out lines render
 * disabled, never hidden) and `quantityBearing` (whether a line gets a stepper)
 * — plus the pricing fields.
 *
 * The pricing fields are read but not used here: the *amount* of a sale Price
 * lives in Stripe, so `page.tsx` resolves the display through
 * `src/lib/checkout/price-display.ts`, which needs the CMS record to know whether
 * a sale is running at all (`docs/agents/pdp-pricing-and-sale-windows.md`).
 */
export const productDetailPageQuery = graphql(`
  query ProductDetailPageQuery($slug: String!) {
    productDetailPage(filter: { slug: { eq: $slug } }) {
      title
      slug
      description
      productType
      gallery {
        id
        alt
        desktopMedia
        mobileMedia
      }
      primaryProducts {
        title
        sku
        shortDescription
        longDescription
        priceId
        salePriceId
        saleStartsAt
        saleEndsAt
        inStock
        quantityBearing
      }
      addonProducts {
        title
        sku
        shortDescription
        longDescription
        priceId
        salePriceId
        saleStartsAt
        saleEndsAt
        inStock
        quantityBearing
      }
      dataCollectors {
        id
        title
        formFields {
          label
          fieldName
          fieldType
          required
          options
          placeholder
          repeatable
          max
        }
      }
    }
  }
`)

export const productDetailPageSlugs = graphql(`
  query ProductDetailPageSlugsQuery {
    allProductDetailPages(filter: { _status: { eq: published } }) {
      slug
    }
  }
`)
