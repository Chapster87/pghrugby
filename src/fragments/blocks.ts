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

export const blocksFragment = graphql(
  `
    fragment BlocksFragment on RecordInterface {
      id
      __typename
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
  `,
  [fileFieldFragment]
)
