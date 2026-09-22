import { ClientError, request } from "graphql-request"

export const cmsCacheTag = "cms-content"

/**
 * Default freshness window (seconds) for CMS reads.
 *
 * The CDA returns GraphQL errors over HTTP 200, which Next would otherwise cache
 * indefinitely — a transient resolver or schema fault would stick on every page.
 * A TTL bounds any such poisoned entry. It is not the visitor-facing freshness
 * promise (the route group's `revalidate` is); it dedupes callers within one
 * render and bounds a cached error. `src/app/api/revalidate/route.ts` purges the
 * tag on the instance's publish signal, so this is the floor, not the only path.
 */
const CMS_CACHE_TTL_SECONDS = 300

/**
 * Raised when the CMS client is misconfigured. Named so a failed build says what
 * is missing in one line, without the reader parsing a stack trace.
 */
export class CmsEnvError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CmsEnvError"
  }
}

/**
 * The standalone ForgeCMS instance's endpoint and delivery key, read together and
 * validated.
 *
 * Both are server-only (neither is `NEXT_PUBLIC_*`) and neither has a fallback:
 * the site no longer embeds the CMS, so there is no in-app origin to derive from,
 * and a defaulted endpoint would quietly point at nothing.
 *
 * @returns The absolute CDA URL and the value for the `x-api-key` header.
 * @throws {CmsEnvError} When either variable is unset.
 */
export function cmsEnv(): { url: string; token: string } {
  const url = process.env.CMS_GRAPHQL_URL
  const token = process.env.CMS_API_TOKEN

  if (!url || !token) {
    const missing = [!url && "CMS_GRAPHQL_URL", !token && "CMS_API_TOKEN"]
      .filter(Boolean)
      .join(", ")

    throw new CmsEnvError(
      `ForgeCMS CDA is not configured: ${missing} unset. The site reads content ` +
        `from the standalone instance (https://cms.pghrugby.com/api/graphql); ` +
        `there is no in-repo fallback.`
    )
  }

  return { url, token }
}

/**
 * Absolute GraphQL endpoint for the ForgeCMS CDA running at `cms.pghrugby.com`.
 */
export function getCmsGraphqlUrl(): string {
  return cmsEnv().url
}

/**
 * True when a failure is a genuine CMS outage: a 5xx, or a network-level failure
 * with no HTTP response at all (DNS, TLS, connection reset, timeout).
 */
function isCmsOutage(error: unknown): boolean {
  if (error instanceof ClientError) {
    return error.response.status >= 500
  }

  // No response was produced — `fetch` rejected before the CDA answered.
  return true
}

/**
 * True for an HTTP 200 carrying *execution* errors — a resolver fault on the CMS
 * side. Degradable, but never silent, so it is logged at error level.
 *
 * GraphQL distinguishes the two kinds of `errors` entry without a status code: a
 * *validation* error (the schema rejects the query) has no `path`, while an
 * *execution* error (a resolver threw) does. Validation errors are site bugs and
 * are thrown rather than degraded — schema drift must not hide as empty chrome.
 */
function isExecutionError(error: unknown): boolean {
  if (!(error instanceof ClientError)) return false
  if (error.response.status !== 200) return false

  const errors = (error.response as { errors?: readonly unknown[] }).errors
  if (!Array.isArray(errors)) return false

  return errors.some(
    (entry) => typeof entry === "object" && entry !== null && "path" in entry
  )
}

/**
 * Executes a GraphQL query against the CMS Content Delivery API.
 *
 * When `graceful` is true the call degrades to an empty result only for the two
 * failures a caller can meaningfully survive: an outage (5xx, network, timeout)
 * and a 200 carrying execution errors. Every other failure — a refused key
 * (401), a malformed query (400), a schema mismatch, or missing configuration —
 * throws, so a real fault cannot hide as blank chrome. Consumers must still treat
 * a degraded result as potentially empty (they already default unset fields with
 * optional chaining / `?? []`).
 *
 * Callers on a prerendered surface leave `graceful` off entirely: under ISR a
 * failed regeneration keeps serving the last good page, so degrading would
 * replace real content with nothing. It survives only where no stale copy exists.
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
  // Outside the try: an unconfigured client fails loudly and is never degraded.
  const { url, token } = cmsEnv()

  const headers = {
    "Content-Type": "application/json",
    "x-api-key": token,
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
      // Log a sanitized reason only: a raw `graphql-request` error carries
      // `request.headers` (including `x-api-key`), and this runs during
      // `next build`, where the host's secret scanner reads the log.
      const reason = error instanceof Error ? error.message : "unknown error"

      if (isCmsOutage(error)) {
        console.warn(
          `[forgecms] CMS unreachable; falling back to an empty result. ` +
            `(${url}) ${reason}`
        )
        return {} as Result
      }

      if (isExecutionError(error)) {
        console.error(
          `[forgecms] CMS returned GraphQL execution errors; falling back to ` +
            `an empty result. (${url}) ${reason}`
        )
        return {} as Result
      }
    }

    throw error
  }
}
