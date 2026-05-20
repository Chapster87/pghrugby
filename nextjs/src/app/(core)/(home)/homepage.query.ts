import { seoFragment } from "@fragments/seo-fragment"
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

export const homepageQuery = `
  *[_type == "homepage"][0]{
    pageBuilder[] {
      ...,
      _type == "linkGroup" => {
        ...,
        links[] {
          _type,
          text,
          openInNewTab,
          customLink,
          route,
          asButton,
          style,
          reference-> {
            _id, title, slug, _type
          }
        }
      }
    },
    ${seoFragment}
  }
`

export const homeQuery = graphql(
  `
    query HomeQuery {
      homepage {
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

// Query to fetch the last 8 pages or posts added by date
export const latestContentQuery = `
  *[_type in ['post'] && !(_id match "draft.*") && (!defined(excludeFromHomepageSlider) || excludeFromHomepageSlider != true)]|order(date desc)[0...8]{
    _id,
    _type,
    title,
    slug,
    date,
    modified,
    status,
    content,
    excerpt,
    featuredMedia,
    sticky,
    author,
    categories,
    tags,
    seo
  }
`
