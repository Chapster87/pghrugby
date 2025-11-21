import { seoFragment } from "@fragments/seo-fragment"

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
