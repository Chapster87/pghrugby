import { graphql } from "@/lib/datocms/graphql"

/**
 * The file fields a block's asset carries.
 *
 * Declared on `FileFieldInterface`, not on `FileField`. The CDA rejects the
 * narrower condition as soon as the read carries `excludeInvalid` — which
 * `executeQuery` sets by default — with "Fragment FileFieldFragment on FileField
 * can't be spread inside ImageFileField", naming a type the published schema does
 * not contain. A `FileFieldFragment on FileField` document therefore passes
 * `gql.tada` and then fails at runtime on **every** route that reads a page body
 * (`page`, `article`, `membership`, the homepage), not just the PDP. The interface
 * is the supertype the CDA's own asset types satisfy, so it validates under both
 * settings and selects the same fields.
 */
export const fileFieldFragment = graphql(`
  fragment FileFieldFragment on FileFieldInterface {
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
