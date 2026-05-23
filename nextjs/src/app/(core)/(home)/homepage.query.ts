import { seoFragment } from "@sanity-fragments/seo-fragment"
import { graphql } from "@/lib/datocms/graphql"
import { blocksFragment, fileFieldFragment } from "@fragments/blocks"

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
            ...BlocksFragment
          }
        }
      }
    }
  `,
  [fileFieldFragment, blocksFragment]
)

export const latestContentQueryDato = graphql(
  `
    query ArticlesQuery {
      allArticles(orderBy: [_createdAt_ASC], first: 8) {
        slug
      }
    }
  `
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
