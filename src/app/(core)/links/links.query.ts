// `linktree` is a singleton and a draft-capable model, so it takes `preview` but
// not `includeDrafts`: the CDA defines that argument on collections only — a
// single query's arguments are `id` / `slug` / `preview` (`CDACore.generateQueryType`).
// The argument is inert unless the request presents the preview key; the default
// keeps the published read unchanged for a caller that passes no variables.
export const linksQuery = `
  query linksQuery($preview: Boolean = false) {
    linktree(preview: $preview) {
      id
      top_links
      club_info
    }
  }
`
