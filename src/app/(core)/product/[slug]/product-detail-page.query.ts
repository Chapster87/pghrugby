import { graphql } from "@/lib/datocms/graphql"
import { blocksFragment, fileFieldFragment } from "@fragments/blocks"

/**
 * The PDP's content read.
 *
 * Reads the three curated buckets (primaries / add-ons / data collectors), the
 * page-owned gallery, and the page's `product_type`. Product fields carry the
 * two commerce flags the buy box renders on — `inStock` (sold-out lines render
 * disabled, never hidden) and `quantityBearing` (whether a line gets a stepper)
 * — plus the pricing fields.
 *
 * `anyAmountProduct` is the Donate page's standalone pay-what-you-want record
 * (`donation-club-any`), read **outside** the three buckets on purpose: it is not
 * a cart primary and never a cart line
 * (`docs/agents/donate-pdp-preset-selection.md` § 3). It carries only what the
 * affordance renders — a label and the `in_stock` switch — plus its `sku`, which
 * is what lets the render confirm the field points at the record the standalone
 * route bills. The Price itself is resolved by that route, not here.
 *
 * Copy comes from two places now, and only two. The page owns the tagline
 * (`shortDescription`) and the event meta line (`eventStartsAt` /
 * `eventLocation`); the product owns its full copy (`description`). A product has
 * no short copy of its own — the field was dropped when the tagline moved to the
 * page (`docs/pdp-to-minicart-to-checkout-spec.md` § 4.3).
 *
 * The tagline is Structured Text, restricted to links and emphasis (§ 4.1), so it
 * is read as a document rather than a string and rendered through
 * `StructuredText`. It carries no blocks, which is why no block fragment is
 * spread here.
 *
 * `tabs` is the authored panel set (§ 4.7), read with the shared block fragment
 * so a panel body can carry the same embeds a page body does. Two blocks are
 * allowed on the field — `tab`, a generic panel, and `tab_desc`, the Description
 * panel — which makes it a **union**, so each is selected through its own inline
 * fragment and discriminated by `__typename` in `page.tsx`. The renderer
 * enumerates this field rather than naming panels of its own (§ 5.6).
 *
 * The pricing fields are read but not used here: the *amount* of a sale Price
 * lives in Stripe, so `page.tsx` resolves the display through
 * `src/lib/checkout/price-display.ts`, which needs the CMS record to know whether
 * a sale is running at all (`docs/agents/pdp-pricing-and-sale-windows.md`).
 */
export const productDetailPageQuery = graphql(
  `
    query ProductDetailPageQuery($slug: String!) {
      productDetailPage(filter: { slug: { eq: $slug } }) {
        title
        slug
        shortDescription {
          value
        }
        eventStartsAt
        eventLocation
        productType
        gallery {
          id
          alt
          desktopMedia
          mobileMedia
        }
        tabs {
          __typename
          ... on TabRecord {
            id
            title
            content {
              value
              blocks {
                ...BlocksFragment
              }
            }
          }
          ... on TabDescRecord {
            id
            title
            content {
              value
              blocks {
                ...BlocksFragment
              }
            }
          }
        }
        primaryProducts {
          title
          sku
          description
          priceId
          salePriceId
          saleStartsAt
          saleEndsAt
          inStock
          quantityBearing
        }
        anyAmountProduct {
          sku
          title
          inStock
        }
        addonProducts {
          title
          sku
          description
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
  `,
  [fileFieldFragment, blocksFragment]
)

export const productDetailPageSlugs = graphql(`
  query ProductDetailPageSlugsQuery {
    allProductDetailPages(filter: { _status: { eq: published } }) {
      slug
    }
  }
`)
