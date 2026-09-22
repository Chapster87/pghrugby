import { createHmac, timingSafeEqual } from "node:crypto"
import { revalidateTag } from "next/cache"
import { NextResponse } from "next/server"

/**
 * Receives publish signals from the site's content sources and invalidates the
 * CDA-fed caches behind them.
 *
 * Two senders, two credentials, one contract. Each names the tags it invalidates
 * in the body, so the signal and the CDA agree on one name and this cannot purge
 * something a sender did not name.
 *
 * - **ForgeCMS** (`Chapster87/pghrugby-cms`, Railway) POSTs a signed,
 *   content-free envelope whenever a published view changes — `publish`,
 *   `unpublish`, `delete`, or `manual` — naming `cms-content`, the tag every read
 *   through `src/lib/forgecms/execute-query.ts` carries. It authenticates with an
 *   HMAC-SHA256 over the raw body in `X-ForgeCMS-Signature`, verified against
 *   `CMS_WEBHOOK_SECRET`. See `docs/WEBHOOKS.md` in the instance repo.
 * - **DatoCMS** POSTs a record-lifecycle webhook (`publish`/`unpublish`/`delete`)
 *   whose body is a Mustache payload template naming `datocms`, the tag
 *   `src/lib/datocms/executeQuery.ts` puts on every read. DatoCMS cannot sign a
 *   body, so it presents the shared secret in `X-Revalidate-Secret`
 *   (`REVALIDATE_SECRET`) instead — a custom header rather than a query
 *   parameter, so the credential stays out of access logs.
 *
 * The route is public by necessity — neither sender has a session to present —
 * so the credential IS the auth. Each path fails closed on its own unset secret,
 * and a request presenting no credential at all is refused.
 */

/** Header carrying `sha256=<hex>`, an HMAC over the raw request body. */
const SIGNATURE_HEADER = "x-forgecms-signature"
const SIGNATURE_PREFIX = "sha256="

/** Header carrying the DatoCMS shared secret verbatim. */
const SHARED_SECRET_HEADER = "x-revalidate-secret"

/** The body both senders deliver: the tags to purge, plus optional context. */
type Delivery = { event?: string; cacheTags?: unknown }

/**
 * Compares two secrets in constant time. A length mismatch is rejected outright
 * — `timingSafeEqual` throws on unequal buffers, and a differing length is
 * already a mismatch.
 *
 * @param presented - The value the caller supplied.
 * @param expected - The configured secret.
 * @returns True when the two are identical.
 */
function secretsMatch(presented: string, expected: string): boolean {
  const given = Buffer.from(presented, "utf8")
  const ours = Buffer.from(expected, "utf8")

  return given.length === ours.length && timingSafeEqual(given, ours)
}

/**
 * The string tags a delivery names, ignoring anything malformed.
 *
 * @param delivery - The parsed request body.
 * @returns The tags to invalidate; empty when the body named none.
 */
function deliveredTags(delivery: Delivery): string[] {
  return Array.isArray(delivery.cacheTags)
    ? delivery.cacheTags.filter((tag): tag is string => typeof tag === "string")
    : []
}

/**
 * POST /api/revalidate
 *
 * @param request - A delivery from the ForgeCMS instance or a DatoCMS webhook.
 * @returns 200 with the tags invalidated, or 401/400/503 when refused.
 */
export async function POST(request: Request) {
  // Read the raw body FIRST — the ForgeCMS signature covers these exact bytes,
  // so asking for JSON before this would consume them.
  const rawBody = await request.text()

  const signature = request.headers.get(SIGNATURE_HEADER)
  const sharedSecret = request.headers.get(SHARED_SECRET_HEADER)

  let sender: "forgecms" | "datocms"

  if (signature) {
    // The signature is bound to the body, so where it is present it is the only
    // credential considered — a bad one is refused rather than falling through
    // to the other path.
    sender = "forgecms"

    const secret = process.env.CMS_WEBHOOK_SECRET
    if (!secret) {
      // Fail closed: unconfigured must not mean "accept anything".
      return NextResponse.json({ error: "not configured" }, { status: 503 })
    }

    if (!signature.startsWith(SIGNATURE_PREFIX)) {
      return NextResponse.json({ error: "missing signature" }, { status: 401 })
    }

    const expected = createHmac("sha256", secret)
      .update(rawBody, "utf8")
      .digest("hex")

    if (!secretsMatch(signature.slice(SIGNATURE_PREFIX.length), expected)) {
      return NextResponse.json({ error: "bad signature" }, { status: 401 })
    }
  } else if (sharedSecret) {
    sender = "datocms"

    const secret = process.env.REVALIDATE_SECRET
    if (!secret) {
      return NextResponse.json({ error: "not configured" }, { status: 503 })
    }

    if (!secretsMatch(sharedSecret, secret)) {
      return NextResponse.json({ error: "bad secret" }, { status: 401 })
    }
  } else {
    return NextResponse.json({ error: "missing credential" }, { status: 401 })
  }

  let delivery: Delivery
  try {
    delivery = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  const tags = deliveredTags(delivery)

  // `{ expire: 0 }` rather than the `"max"` cache-life profile: a publish should
  // make the next request re-read, not serve the stale entry while revalidation
  // runs behind it.
  for (const tag of tags) {
    revalidateTag(tag, { expire: 0 })
  }

  return NextResponse.json({ ok: true, sender, event: delivery.event, tags })
}
