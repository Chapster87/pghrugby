import { graphql } from "@/lib/datocms/graphql"

// Latest published articles for the sidebar "Latest Posts" widget.
export const latestContentQuery = graphql(`
  query LatestPostsQuery {
    allArticles(filter: { _status: { eq: published } }, orderBy: [_updatedAt_DESC], first: 5) {
      slug
      title
    }
  }
`)
