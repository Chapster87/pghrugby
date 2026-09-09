import { request } from "graphql-request"

export const cmsCacheTag = "cms-content"

/**
 * Executes a GraphQL query against the CMS Content Delivery API.
 *
 * When `graceful` is true, an unreachable CMS (e.g. no connection / missing
 * credentials during local development) does not throw: the query resolves to
 * an empty result so callers can render their fallbacks. Consumers must treat
 * the result as potentially empty (they already default unset fields with
 * optional chaining / `?? []`). Production content queries should leave
 * `graceful` off so genuine outages surface as errors.
 */
export async function executeQuery<
  Result = any,
  Variables = Record<string, any>
>(
  query: string,
  options?: {
    variables?: Variables
    cache?: RequestCache
    revalidate?: number | false
    graceful?: boolean
  }
): Promise<Result> {
  const url = `${process.env.FORGECMS_API_URL}/api/graphql`

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": process.env.FORGECMS_API_TOKEN!,
  }

  // Next.js Data Cache options
  const requestInit: any = {
    cache: options?.cache ?? "force-cache",
    next: {
      tags: [cmsCacheTag],
      revalidate: options?.revalidate,
    },
  }

  try {
    return await request<Result>({
      url,
      document: query,
      variables: options?.variables,
      requestHeaders: headers,
      ...requestInit,
    } as any)
  } catch (error) {
    if (options?.graceful) {
      // The CMS is unavailable (offline, misconfigured, or not running during
      // local development). Resolve to an empty result so chrome (nav, site
      // settings, sponsors) degrades instead of crashing the page.
      console.warn(
        `[forgecms] Query failed; falling back to an empty result. ` +
          `Is the CMS reachable at "${url}"?\n`,
        error
      )
      return {} as Result
    }
    throw error
  }
}
