import "server-only"

import { executeQuery as libExecuteQuery } from "@datocms/cda-client"
import type { TadaDocumentNode } from "gql.tada"

import { isDatocmsPreviewEnabled } from "@/lib/cms-preview"

export const cacheTag = "datocms"

/**
 * Freshness window (seconds) for DatoCMS reads.
 *
 * Deliberately equal to the `(core)` group's ISR window (`(core)/layout.tsx`). A
 * fetch's `revalidate` lowers the whole route's window, not just that fetch's
 * cache entry, so a shorter value here would quietly become the visitor-facing
 * freshness for every route that reads DatoCMS and leave the group's own window
 * meaningless. The two are one number; keep them equal.
 *
 * A DatoCMS publish reaches the site as a webhook, which is the fast path; this
 * bounds how long a missed delivery is served stale.
 */
const DATOCMS_CACHE_TTL_SECONDS = 3600

/**
 * Executes a GraphQL query using the DatoCMS Content Delivery API, and caches
 * the result in Next.js Data Cache using the `cache: 'force-cache'` option.
 * This means that regular visitors won't generate additional calls to DatoCMS.
 *
 * `includeDrafts` is a *local* affordance: the caller asks to preview, and the
 * dev-only switch (`@/lib/cms-preview`) has to agree, or the read stays on the
 * published token. The two are composed once here so the token, the Content-Link
 * stega and the editing URL can never disagree — and so a production runtime
 * cannot reach the draft token even if a caller asks.
 *
 * The fetch carries the `datocms` tag and an explicit `revalidate` window, so
 * freshness has two paths: the window bounds a missed webhook, and
 * `src/app/api/revalidate/route.ts` purges the tag the moment DatoCMS's webhook
 * fires. The window is set here rather than inherited from the enclosing route
 * group's `revalidate`, so that a page moving between groups — or a fetch made
 * outside a prerendered route — cannot silently lose its expiry and serve a
 * stale entry indefinitely.
 */
export async function executeQuery<Result, Variables>(
  query: TadaDocumentNode<Result, Variables>,
  options?: ExecuteQueryOptions<Variables>
) {
  const includeDrafts =
    options?.includeDrafts === true && isDatocmsPreviewEnabled()

  // Overlays ride with a draft read by default, but they are separable: stega
  // rewrites *every* string field, so a read that carries an identifier — the
  // PDP's `sku` and `priceId` — asks for drafts without them.
  const withOverlays = includeDrafts && (options?.contentLink ?? true)

  const result = await libExecuteQuery(query, {
    variables: options?.variables,
    excludeInvalid: options?.excludeInvalid ?? true, // Always exclude invalid by default
    includeDrafts,
    token: includeDrafts
      ? process.env.DATOCMS_DRAFT_CONTENT_CDA_TOKEN!
      : process.env.DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN!,
    /*
     * Enable content-link for draft content only. This embeds stega-encoded
     * metadata in text fields, which the @datocms/content-link package uses
     * to create click-to-edit overlays. When editors click on content, they're
     * taken directly to the corresponding field in the DatoCMS editor.
     *
     * This works both:
     * - On the standalone website (opens DatoCMS in a new tab)
     * - Inside the Web Previews plugin Visual mode (opens field in side panel)
     *
     * Only a draft read carries them, so production pays nothing; and a caller
     * passes `contentLink: false` to drop them, which a read selecting an
     * identifier must do — stega rewrites every string, so a `sku` or a
     * `priceId` comes back encoded and stops matching the plain value it is
     * compared against.
     */
    contentLink: withOverlays ? "v1" : undefined,
    baseEditingUrl: withOverlays
      ? process.env.DATOCMS_BASE_EDITING_URL
      : undefined,
    requestInitOptions: {
      cache: "force-cache",
      /*
       * This project utilizes an extremely basic cache invalidation
       * technique: by using the `next.tags` option, all requests to DatoCMS
       * are tagged with "datocms" in the Next.js Data Cache. Whenever DatoCMS
       * notifies us of any updates via webhook, we invalidate all requests
       * with the same tag.
       *
       * Although this caching strategy may be sufficient for smaller
       * websites, it is not advised for larger projects. Fortunately, with
       * DatoCMS and Next, it is possible to implement a much more detailed
       * invalidation strategy!
       *
       * For more info: https://www.datocms.com/docs/next-js/using-cache-tags
       */
      next: {
        // Explicit expiry, not inherited — see DATOCMS_CACHE_TTL_SECONDS.
        revalidate: DATOCMS_CACHE_TTL_SECONDS,
        tags: [cacheTag],
      },
    },
  })

  return result
}

type ExecuteQueryOptions<Variables> = {
  variables?: Variables
  excludeInvalid?: boolean
  includeDrafts?: boolean
  /**
   * Content-Link stega and click-to-edit on a draft read. Defaults to true; pass
   * false from a read that selects an identifier, which stega would rewrite.
   */
  contentLink?: boolean
}
