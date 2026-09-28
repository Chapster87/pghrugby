/**
 * Force an on-demand revalidation of the site's CDA-fed caches.
 *
 * A publish normally invalidates itself: the ForgeCMS instance and the DatoCMS record
 * webhook both POST `src/app/api/revalidate/route.ts`. This exists for when it does not —
 * a missed delivery, or a webhook that answers 200 while purging nothing because its
 * payload named no `cacheTags`.
 *
 * Two senders, two credentials, matching the route:
 *   `cms-content` — the ForgeCMS path: an HMAC-SHA256 of the exact request body in
 *                   `X-ForgeCMS-Signature`, keyed with `CMS_WEBHOOK_SECRET`.
 *   anything else — the DatoCMS path (the `datocms` tag): the shared secret verbatim in
 *                   `X-Revalidate-Secret` (`REVALIDATE_SECRET`), because DatoCMS cannot
 *                   sign a body.
 *
 * Run from the repo root:
 *   pnpm revalidate                    # both tags — the default, one request per sender
 *   pnpm revalidate datocms            # DatoCMS content only
 *   pnpm revalidate cms-content        # ForgeCMS content only
 *
 * Aim it elsewhere with `REVALIDATE_URL`. Purges are rate-limited (~2 per tag per 5s, then
 * 429), so this is not a polling tool.
 */
import { createHmac } from "node:crypto"

const url =
  process.env.REVALIDATE_URL || "https://next.pghrugby.com/api/revalidate"

// Both by default: which source a page is fed from is an implementation detail, and the
// two credentials cannot be merged into one request without one sender naming a tag it
// does not own. So the default costs two requests and saves remembering the split.
const tags = process.argv.slice(2)
if (tags.length === 0) tags.push("datocms", "cms-content")

/**
 * Posts one delivery and prints the route's answer.
 *
 * @param label - What this delivery is, for the log line.
 * @param body - The exact bytes to send; the ForgeCMS signature covers these.
 * @param headers - The credential header for this sender.
 * @returns The HTTP status.
 */
async function deliver(label, body, headers) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  })

  console.log(`${label}: HTTP ${response.status} ${await response.text()}`)
  return response.status
}

/** The tags each sender owns; `cms-content` is the ForgeCMS one, the rest DatoCMS. */
const forgecmsTags = tags.filter((tag) => tag === "cms-content")
const datocmsTags = tags.filter((tag) => tag !== "cms-content")

console.log(`Revalidating ${tags.join(", ")} at ${url}`)

let refused = false

if (datocmsTags.length > 0) {
  const secret = process.env.REVALIDATE_SECRET
  if (!secret) {
    console.error(
      "REVALIDATE_SECRET is unset — the DatoCMS path cannot be used."
    )
    refused = true
  } else {
    const body = JSON.stringify({ event: "manual", cacheTags: datocmsTags })
    const status = await deliver("datocms", body, {
      "X-Revalidate-Secret": secret,
    })
    if (status !== 200) refused = true
  }
}

if (forgecmsTags.length > 0) {
  const secret = process.env.CMS_WEBHOOK_SECRET
  if (!secret) {
    console.error(
      "CMS_WEBHOOK_SECRET is unset — the ForgeCMS path cannot be used."
    )
    refused = true
  } else {
    const body = JSON.stringify({ event: "manual", cacheTags: forgecmsTags })
    const signature = createHmac("sha256", secret)
      .update(body, "utf8")
      .digest("hex")
    const status = await deliver("forgecms", body, {
      "X-ForgeCMS-Signature": `sha256=${signature}`,
    })
    if (status !== 200) refused = true
  }
}

if (refused) {
  console.error(
    "\nA delivery was refused (401) or could not be signed. A 401 on the DatoCMS path " +
      "means this machine's REVALIDATE_SECRET differs from the host's, which would also " +
      "explain a webhook that fires and purges nothing."
  )
  process.exitCode = 1
}
