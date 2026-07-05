import { graphql } from "@/lib/datocms/graphql"
import { blocksFragment, fileFieldFragment } from "@fragments/blocks"

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
            ...BlocksFragment
          }
        }
      }
    }
  `,
  [fileFieldFragment, blocksFragment]
)

export const latestContentQuery = graphql(
  `
    query ArticlesQuery {
      allArticles(orderBy: [_createdAt_ASC], first: 8) {
        slug
        title
        featuredImage
        wpexcerpt
        _updatedAt
      }
    }
  `
)
