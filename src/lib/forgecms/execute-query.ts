import { request } from "graphql-request"

export const cmsCacheTag = "cms-content"

/**
 * Default freshness window (seconds) for CMS reads. The embedded CDA returns
 * GraphQL errors with HTTP 200, which Next would otherwise cache indefinitely —
 * a transient schema/auth error would stick on every page. A TTL bounds any
 * such poisoned entry, and gives content a freshness window, since nothing
 * calls `revalidateTag(cmsCacheTag)` today.
 */
const CMS_CACHE_TTL_SECONDS = 300

/**
 * Host mount for the embedded ForgeCMS core. Mirrors `src/proxy.ts` and
 * `forgecore.json` `mountPath` — not an env var; the core hardcodes the same
 * prefix until a producer-side change.
 */
export const CMS_MOUNT_PATH = "/admin" as const

/** True for origins that only resolve on the developer's machine. */
function isLocalOrigin(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(url)
}

/**
 * Base URL for the embedded CMS's CDA on this app.
 *
 * `NEXT_PUBLIC_BASE_URL` is a public build constant, so a local value
 * (`http://localhost:8000`) can be inlined into a production build and leave
 * the CDA unreachable. Prefer it only when it is a real origin, otherwise fall
 * back to the URL the host publishes for the deploying/running site (Netlify
 * sets `URL` / `DEPLOY_PRIME_URL`), then to local development.
 */
function resolveCmsBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_BASE_URL
  if (configured && !isLocalOrigin(configured)) return configured

  const hosted = process.env.URL || process.env.DEPLOY_PRIME_URL
  if (hosted) return hosted

  return configured || "http://localhost:8000"
}

/**
 * Absolute GraphQL endpoint for the embedded core CDA on this app.
 * `${NEXT_PUBLIC_BASE_URL}/admin/api/graphql` in a correct deploy.
 */
export function getCmsGraphqlUrl(): string {
  const base = resolveCmsBaseUrl().replace(/\/$/, "")
  return `${base}${CMS_MOUNT_PATH}/api/graphql`
}

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
  const url = getCmsGraphqlUrl()

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": process.env.CMS_API_TOKEN!,
  }

  // Next.js Data Cache options
  const requestInit: any = {
    cache: options?.cache ?? "force-cache",
    next: {
      tags: [cmsCacheTag],
      // See CMS_CACHE_TTL_SECONDS: bounds stale/poisoned entries. Callers can
      // override, including with `false` to opt out of expiry.
      revalidate: options?.revalidate ?? CMS_CACHE_TTL_SECONDS,
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
      // local development / a build). Resolve to an empty result so chrome
      // (nav, site settings, sponsors) degrades instead of crashing the page.
      //
      // Log a sanitized reason only: the raw error carries `request.headers`
      // (including `x-api-key`), and this runs during `next build`, where the
      // host's secret scanner reads the log.
      const reason = error instanceof Error ? error.message : "unknown error"
      console.warn(
        `[forgecms] Query failed; falling back to an empty result. ` +
          `Is the CMS reachable at "${url}"? (${reason})`
      )
      return {} as Result
    }
    throw error
  }
}
