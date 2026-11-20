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

/**
 * The blocks that can appear anywhere a body appears — including inside a
 * column.
 *
 * Split out from `BlocksFragment` so the columns block can select its own
 * children without the document referring to itself. A fragment that spreads
 * itself is an invalid GraphQL document, even when the schema is what stops the
 * recursion; one level of indirection is what lets the columns block nest.
 *
 * The set is closed: `columns_block` is deliberately absent, because the CMS
 * does not allow it inside a column.
 */
export const leafBlocksFragment = graphql(
  `
    fragment LeafBlocksFragment on RecordInterface {
      id
      __typename
      ... on ExternalImageBlockRecord {
        id
        __typename
        url
        cloudinary
        caption
        alignment
        width
        linkUrl
        openInNewTab
        alt
      }
      ... on ImageBlockRecord {
        id
        __typename
        asset {
          ...FileFieldFragment
        }
        caption
        alignment
        width
        linkUrl
        openInNewTab
        alt
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
      ... on LinkButtonRecord {
        id
        __typename
        label
        href
        variant
        size
        openInNewTab
      }
    }
  `,
  [fileFieldFragment]
)

/**
 * Every block a body can carry.
 *
 * The columns block selects both columns as Structured Text, each with its own
 * list of leaf blocks — the renderer resolves those per column, so the document
 * and the canonical map stay one level deep.
 */
export const blocksFragment = graphql(
  `
    fragment BlocksFragment on RecordInterface {
      ...LeafBlocksFragment
      ... on ColumnsBlockRecord {
        id
        __typename
        sectionId
        split
        gap
        alignment
        columnOne {
          value
          blocks {
            ...LeafBlocksFragment
          }
        }
        columnTwo {
          value
          blocks {
            ...LeafBlocksFragment
          }
        }
      }
    }
  `,
  [leafBlocksFragment]
)
