import { graphql } from "@/lib/datocms/graphql"

export const fileFieldFragment = graphql(`
  fragment FileFieldFragment on FileField {
    id
    url
    alt
    width
    height
    title
  }
`)

export const pageSlugs = graphql(`
  query PageSlugsQuery {
    allPages(filter: { _status: { eq: published } }) {
      slug
    }
  }
`)

export const pageQuery = graphql(
  `
    query PageQuery($slug: String!) {
      page(filter: { slug: { eq: $slug } }) {
        title
        author {
          name
        }
        canonicalUrl
        creationDate
        _updatedAt
        wpexcerpt
        featuredImage
        metaDescription
        metaImage
        metaKeywords
        metaRobots
        metaTitle
        content {
          value
          blocks {
            ... on ExternalImageBlockRecord {
              id
              __typename
              url
              cloudinary
            }
            ... on ImageBlockRecord {
              id
              __typename
              asset {
                ...FileFieldFragment
              }
            }
            ... on ImageGalleryBlockRecord {
              id
              __typename
              assets {
                ...FileFieldFragment
              }
            }
            ... on VideoBlockRecord {
              id
              __typename
              asset {
                ...FileFieldFragment
              }
            }
          }
        }
      }
    }
  `,
  [fileFieldFragment]
)
