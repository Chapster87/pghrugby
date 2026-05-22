import { seoFragment } from "@sanity-fragments/seo-fragment"
import { graphql } from "@/lib/datocms/graphql"
import { blocksFragment, fileFieldFragment } from "@fragments/blocks"

export const membershipQuerySanity = `
  *[_type == "membership"][0]{
    title,
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
