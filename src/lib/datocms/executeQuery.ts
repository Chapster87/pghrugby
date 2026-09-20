import { executeQuery as libExecuteQuery } from "@datocms/cda-client"
import type { TadaDocumentNode } from "gql.tada"

export const cacheTag = "datocms"

/**
 * Executes a GraphQL query using the DatoCMS Content Delivery API, and caches
 * the result in Next.js Data Cache using the `cache: 'force-cache'` option.
 * This means that regular visitors won't generate additional calls to DatoCMS.
 *
 * The fetch carries the `datocms` tag and sets no `revalidate` of its own, so
 * freshness comes from the route's `revalidate` window plus on-demand
 * `revalidateTag('datocms')`.
 *
 * @TODO: the webhook-based invalidation this used to reference does not exist —
 * there is no `invalidate-cache` route in this repo and nothing calls
 * `revalidateTag('datocms')`. On Netlify the Data Cache is deploy-scoped, so
 * content currently refreshes only on redeploy. Build the route (calling
 * `revalidateTag(tag, "max")`, which Next 16 requires over the deprecated
 * single-argument form) and point the DatoCMS webhook at it.
 */
export async function executeQuery<Result, Variables>(
  query: TadaDocumentNode<Result, Variables>,
  options?: ExecuteQueryOptions<Variables>
) {
  const result = await libExecuteQuery(query, {
    variables: options?.variables,
    excludeInvalid: options?.excludeInvalid ?? true, // Always exclude invalid by default
    includeDrafts: options?.includeDrafts,
    token: options?.includeDrafts
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
     * Only enabled for draft content to avoid the overhead in production.
     */
    contentLink: options?.includeDrafts ? "v1" : undefined,
    baseEditingUrl: options?.includeDrafts
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
  baseEditingUrl?: boolean
}
