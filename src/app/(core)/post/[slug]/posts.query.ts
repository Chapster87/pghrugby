import { graphql } from "@/lib/datocms/graphql"
import { blocksFragment, fileFieldFragment } from "@fragments/blocks"

export const postSlugs = graphql(`
  query PostSlugsQuery {
    allArticles(filter: { _status: { eq: published } }, orderBy: [_updatedAt_DESC]) {
      slug
    }
  }
`)

export const postQuery = graphql(
  `
    query PostQuery($slug: String!) {
      article(filter: { slug: { eq: $slug } }) {
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
        tags
        categories {
          name
          slug
        }
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
