import { graphql } from "@/lib/datocms/graphql"

export const productDetailPageQuery = graphql(`
  query ProductDetailPageQuery($slug: String!) {
    productDetailPage(filter: { slug: { eq: $slug } }) {
      title
      slug
      description
      pageComponents {
        ... on ProductRecord {
          __typename
          title
          sku
          shortDescription
          longDescription
          priceId
        }
        ... on DataCollectorRecord {
          __typename
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
  }
`)

export const productDetailPageSlugs = graphql(`
  query ProductDetailPageSlugsQuery {
    allProductDetailPages(filter: { _status: { eq: published } }) {
      slug
    }
  }
`)
