import { graphql } from "@/lib/datocms/graphql"
import { blocksFragment, fileFieldFragment } from "@fragments/blocks"

export const membershipQuery = graphql(
  `
    query MembershipQuery {
      membership {
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
