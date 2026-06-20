import { request } from "graphql-request"

export const cmsCacheTag = "cms-content"

/**
 * Executes a GraphQL query against the CMS Content Delivery API.
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

  return request<Result>({
    url,
    document: query,
    variables: options?.variables,
    requestHeaders: headers,
    ...requestInit,
  } as any)
}
