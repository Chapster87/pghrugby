const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i

/** Origin assumed when nothing is configured and no host publishes one — dev only. */
const DEV_ORIGIN = "http://localhost:8000"

/**
 * The origin the current deploy answers on.
 *
 * Resolution order:
 *
 * 1. `NEXT_PUBLIC_BASE_URL` — set **per Netlify deploy context**, since it is
 *    inlined at build time; `production` and `branch-deploy` each name their own
 *    origin.
 * 2. `DEPLOY_PRIME_URL` before `URL`. Netlify publishes the origin of *this*
 *    deploy and the site's main URL respectively, and a Deploy Preview's origin
 *    is per-pull-request, so it cannot be inlined. Preferring the deploy's own
 *    keeps a preview's canonical and Stripe `return_url` values on that preview
 *    instead of on production.
 * 3. A configured developer origin, which is a deliberate local choice.
 * 4. `DEV_ORIGIN` in development, and a **throw** in production.
 *
 * A developer origin can never satisfy steps 1 or 2: inlined into a production
 * build it would leak into canonical, Open Graph and `return_url` values. The
 * throw means a deploy with nothing resolvable fails loudly rather than
 * publishing wrong absolute URLs.
 *
 * @returns The absolute origin, with no trailing slash.
 * @throws When a production build has no resolvable origin.
 */
export const getBaseURL = () => {
  const configured = process.env.NEXT_PUBLIC_BASE_URL
  const published = process.env.DEPLOY_PRIME_URL || process.env.URL

  if (configured && !LOCAL_ORIGIN.test(configured)) return configured
  if (published && !LOCAL_ORIGIN.test(published)) return published
  if (configured) return configured

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "No site origin: NEXT_PUBLIC_BASE_URL is unset and the host publishes neither " +
        "DEPLOY_PRIME_URL nor URL. Set NEXT_PUBLIC_BASE_URL to this deploy's origin."
    )
  }

  return DEV_ORIGIN
}
