// Query to fetch the last 8 pages or posts added by date
export const latestContentQuery = `
  *[_type in ['post'] && !(_id match "draft.*") && (!defined(excludeFromHomepageSlider) || excludeFromHomepageSlider != true)]|order(date desc)[0...5]{
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
