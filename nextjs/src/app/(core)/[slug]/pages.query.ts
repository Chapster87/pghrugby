import { defineQuery } from "next-sanity"
import { seoFragment } from "@fragments/seo-fragment"
import { gql } from "graphql-request"
import {
  graphql,
  readFragment,
  type ResultOf,
  type VariablesOf,
} from "@/lib/datocms/graphql"

export const pageQuerySanity = defineQuery(
  `*[_type == "page" && slug.current == $slug][0]{
    _id,
    title,
    "slug": slug.current,
    date,
    modified,
    status,
    pageBuilder,
    content,
    excerpt,
    coverImage,
    featuredMedia{
      asset->{
        url
      },
      alt
    },
    author->{name}
    ,${seoFragment}
  }`
)

export const pagesSlugs = defineQuery(`
  *[_type == "page" && defined(slug.current)]
  {"slug": slug.current}
`)

export const ABOUT_PAGE_QUERY = gql`
  query getAboutPage {
    wpPages(filters: { slug: { eq: "about" } }) {
      title
      slug
      seo {
        canonicalURL
        metaDescription
        metaImage {
          url
        }
      }
      featured_media {
        alternativeText
        url
      }
      content
    }
  }
`

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
