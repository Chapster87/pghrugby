/**
 * Netlify Function: turn a Netlify "deploy succeeded" notification into a
 * `workflow_dispatch` of the production smoke (map #126 decision 4).
 *
 * Netlify's outgoing webhook cannot set an `Authorization` header, so it cannot
 * call GitHub's dispatch API directly — this function is the token-bearing
 * receiver that can. It calls the **workflow-dispatch** endpoint, which needs a
 * token scoped to *Actions: write only*: unlike `repository_dispatch` (which
 * needs Contents: write and could push code), this credential cannot touch the
 * repository's contents.
 *
 * Netlify auto-detects this directory, so no `netlify.toml` is required.
 *
 * Environment (set in the Netlify UI):
 * - `GITHUB_DISPATCH_TOKEN`  — fine-grained PAT, Actions: write on this repo.
 * - `NETLIFY_WEBHOOK_SECRET` — the JWS secret configured on the notification.
 * - `SMOKE_BASE_URL`         — optional; origin to smoke (defaults in the workflow).
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto"

const REPO = "Chapster87/pghrugby"
const WORKFLOW = "production-smoke.yml"
const REF = "trunk"

const json = (statusCode, body) => ({
  statusCode,
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ message: body }),
})

/**
 * Verifies Netlify's outgoing-webhook JWS (HS256) and returns its claims, or
 * null. Netlify signs the body and sends the token as `X-Webhook-Signature`,
 * with `iss` (always "netlify") and `sha256` (hex digest of the body) as claims.
 */
function verifyJws(token, secret) {
  if (!token) return null

  const [header, payload, signature] = token.split(".")
  if (!header || !payload || !signature) return null

  const expected = createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url")

  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString())
    return claims.iss === "netlify" ? claims : null
  } catch {
    return null
  }
}

/** Netlify lower-cases headers inconsistently across runtimes; accept either. */
function readHeader(headers, name) {
  return headers?.[name] ?? headers?.[name.toLowerCase()]
}

export const handler = async (event) => {
  const secret = process.env.NETLIFY_WEBHOOK_SECRET
  const token = process.env.GITHUB_DISPATCH_TOKEN
  if (!secret || !token) return json(503, "not configured")

  const raw = event.isBase64Encoded
    ? Buffer.from(event.body ?? "", "base64").toString("utf8")
    : event.body ?? ""

  const claims = verifyJws(readHeader(event.headers, "x-webhook-signature"), secret)
  if (!claims) return json(401, "bad signature")
  if (claims.sha256 !== createHash("sha256").update(raw).digest("hex")) {
    return json(401, "bad body hash")
  }

  let deploy
  try {
    deploy = JSON.parse(raw)
  } catch {
    return json(400, "bad json")
  }

  // Only a successful *production* deploy should smoke the app; branch deploys
  // and previews share the notification but serve a different origin.
  if (deploy.state !== "ready") return json(202, `ignored: state=${deploy.state}`)
  if (deploy.context && deploy.context !== "production") {
    return json(202, `ignored: context=${deploy.context}`)
  }

  const baseUrl = process.env.SMOKE_BASE_URL
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: REF,
        inputs: baseUrl ? { base_url: baseUrl } : {},
      }),
    }
  )

  if (!res.ok) return json(502, `dispatch failed: ${res.status}`)
  return json(202, "dispatched")
}
