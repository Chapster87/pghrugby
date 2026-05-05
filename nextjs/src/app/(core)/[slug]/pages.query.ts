import { defineQuery } from "next-sanity"
import { seoFragment } from "@fragments/seo-fragment"
import { gql } from "graphql-request"

export const pageQuery = defineQuery(
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

export const pageSlugs = gql`
  query {
    wpPages(status: PUBLISHED, filters: { page_status: { eq: "publish" } }) {
      slug
    }
  }
`

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
