import { createHmac, timingSafeEqual } from "node:crypto"
import { revalidateTag } from "next/cache"
import { NextResponse } from "next/server"

/**
 * Receives the ForgeCMS publish signal and invalidates CDA-fed caches.
 *
 * The standalone instance (`Chapster87/pghrugby-cms`, Railway) POSTs a signed,
 * content-free envelope whenever a published view changes — `publish`,
 * `unpublish`, `delete`, or `manual`. Every read through
 * `src/lib/forgecms/execute-query.ts` carries the `cms-content` tag, so
 * invalidating the tags a delivery names makes the next request re-read rather
 * than waiting out that fetch's 300s window.
 *
 * The route is public by necessity — the instance has no session to present —
 * so the HMAC signature IS the auth. The body is verified before it is parsed,
 * and an unsigned request is refused.
 *
 * The contract it implements: `docs/WEBHOOKS.md` in the instance repo.
 */

/** Header carrying `sha256=<hex>`, an HMAC over the raw request body. */
const SIGNATURE_HEADER = "x-forgecms-signature"
const SIGNATURE_PREFIX = "sha256="

/**
 * POST /api/revalidate
 *
 * @param request - A signed delivery from the ForgeCMS instance.
 * @returns 200 with the tags invalidated, or 401/400/503 when refused.
 */
export async function POST(request: Request) {
  const secret = process.env.CMS_WEBHOOK_SECRET
  if (!secret) {
    // Fail closed: unconfigured must not mean "accept anything".
    return NextResponse.json({ error: "not configured" }, { status: 503 })
  }

  // Read the raw body FIRST — the signature covers these exact bytes, so
  // asking for JSON before this would consume them.
  const rawBody = await request.text()

  const presented = request.headers.get(SIGNATURE_HEADER)
  if (!presented?.startsWith(SIGNATURE_PREFIX)) {
    return NextResponse.json({ error: "missing signature" }, { status: 401 })
  }

  const expected = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex")

  const given = Buffer.from(presented.slice(SIGNATURE_PREFIX.length), "utf8")
  const ours = Buffer.from(expected, "utf8")
  // Constant-time compare; a digest of the wrong length is rejected outright.
  if (given.length !== ours.length || !timingSafeEqual(given, ours)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 })
  }

  let delivery: { event?: string; cacheTags?: unknown }
  try {
    delivery = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  // Only the delivered tags, so the signal and the CDA agree on one name
  // (`cms-content`) and this cannot invalidate something the CMS did not name.
  const tags = Array.isArray(delivery.cacheTags)
    ? delivery.cacheTags.filter((tag): tag is string => typeof tag === "string")
    : []

  // `{ expire: 0 }` rather than the `"max"` profile the DatoCMS webhook is
  // documented to use: an incoming delivery should make the next request
  // re-read, not serve a stale entry while revalidation runs behind it.
  for (const tag of tags) {
    revalidateTag(tag, { expire: 0 })
  }

  return NextResponse.json({ ok: true, event: delivery.event, tags })
}
