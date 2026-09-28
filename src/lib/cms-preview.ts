/**
 * Dev-only preview switches for the two content sources.
 *
 * Preview is a development affordance rather than a deploy posture: a developer
 * running `next dev` with a preview credential in `.env.local` sees unpublished
 * content, and no other runtime can, because the credential is deliberately
 * absent from every other environment. The switch is therefore *the credential's
 * presence in a non-production runtime* — there is no flag to remember to turn
 * off, and nothing to misconfigure on a deploy.
 *
 * `NODE_ENV` is `"production"` for both `next build` and `next start`, so a local
 * production build reads published content even with the credential present.
 * That is what stops a prerendered page from baking in a draft, and it means a
 * Netlify branch deploy or Deploy Preview — which builds exactly like production
 * — cannot preview either.
 *
 * Neither credential is `NEXT_PUBLIC_*`, so neither is inlined into a client
 * bundle. This module is also marked `server-only`, which makes that structural
 * rather than a convention: the build fails if a client component ever reaches
 * it. Every CDA read is server-side, so the preview credential never leaves the
 * server and no route exists to hand it to a browser.
 */

import "server-only"

/**
 * The switch itself: a non-production runtime that carries a preview credential.
 *
 * @param credential - The source's preview credential, if configured.
 * @returns Whether preview reads are enabled for that source.
 */
function isLocalPreview(credential: string | undefined): boolean {
  return process.env.NODE_ENV !== "production" && Boolean(credential)
}

/**
 * Whether the ForgeCMS CDA should serve unpublished content: a non-production
 * runtime that carries `CMS_PREVIEW_TOKEN` in `.env.local`.
 *
 * The CDA gates drafts on the *credential*, not the query arguments — a request
 * presenting the delivery key has `preview` / `includeDrafts` forced off
 * (`CDACore.ts`). So this predicate tells a caller both that the arguments will
 * take effect and that `executeQuery` may present the preview key.
 *
 * @returns True when ForgeCMS preview reads are enabled.
 */
export function isForgeCmsPreviewEnabled(): boolean {
  return isLocalPreview(process.env.CMS_PREVIEW_TOKEN)
}

/**
 * Whether the DatoCMS CDA should serve unpublished content: a non-production
 * runtime that carries `DATOCMS_DRAFT_CONTENT_CDA_TOKEN` in `.env.local`.
 *
 * DatoCMS drafts are requested per query (`includeDrafts`), which also switches
 * the CDA token and enables Content-Link stega. Callers must therefore opt in
 * deliberately, and not from inside a shared data layer: stega rewrites string
 * fields, and a read that *compares* a string (the cart's sku → `product` match)
 * would silently stop matching. Preview belongs on the routes that display
 * content, not on the reads that compute from it.
 *
 * @returns True when DatoCMS preview reads are enabled.
 */
export function isDatocmsPreviewEnabled(): boolean {
  return isLocalPreview(process.env.DATOCMS_DRAFT_CONTENT_CDA_TOKEN)
}
