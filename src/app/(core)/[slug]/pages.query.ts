import { graphql } from "@/lib/datocms/graphql"
import { blocksFragment, fileFieldFragment } from "@fragments/blocks"

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
            ...BlocksFragment
          }
        }
      }
    }
  `,
  [fileFieldFragment, blocksFragment]
)
