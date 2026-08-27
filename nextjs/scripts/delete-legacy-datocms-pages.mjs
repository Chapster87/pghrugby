#!/usr/bin/env node
/**
 * Delete legacy DatoCMS `page` records shadowed by app routes or orphaned.
 *
 * These records are unreachable (a static route or redirect already owns the
 * slug) or are WordPress-migration leftovers no route renders. Nothing is
 * deleted blind — the script verifies each candidate is unused first:
 *
 *   1. Sanity navigation records (footer + header nav) don't link to the slug
 *      (via page/post/product references, `route`, or `customLink`).
 *   2. No DatoCMS structured-text content links to the page (itemLink to the
 *      record, or an external link whose path matches the slug).
 *   3. (Code links + traffic are checked separately — see the ticket.)
 *
 * Usage (from pghrugby/nextjs):
 *   pnpm legacy-pages:cleanup             # verify only: report what is unused
 *   pnpm legacy-pages:cleanup --apply     # verify, then delete unused candidates
 *
 * Reads DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN, DATOCMS_CMA_TOKEN, and the Sanity
 * env vars from `.env.local`.
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const APPLY = process.argv.includes("--apply")

const ENV_LOCAL = resolve(import.meta.dirname, "../.env.local")

// --- env ---------------------------------------------------------------------
function loadEnvLocal() {
  const env = {}
  for (const rawLine of readFileSync(ENV_LOCAL, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    const value = line
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "")
    if (!(key in env)) env[key] = value
  }
  return env
}

const env = loadEnvLocal()

const cdaToken = env.DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN
// Deletion needs a token whose role can destroy records. DATOCMS_CMA_TOKEN is
// bound to the project's read-only role, so prefer DATACMA_FULL_API_TOKEN.
const cmaToken = env.DATACMA_FULL_API_TOKEN || env.DATOCMS_CMA_TOKEN
const sanityProjectId = env.NEXT_PUBLIC_SANITY_PROJECT_ID
const sanityDataset = env.NEXT_PUBLIC_SANITY_DATASET
const sanityToken = env.SANITY_VIEWER_TOKEN

if (!cdaToken) {
  console.error(
    "DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN is not set in .env.local — set it first."
  )
  process.exit(1)
}

// --- candidates --------------------------------------------------------------
// Slugs shadowed by a static route/redirect, or orphaned after the flows moved
// to Stripe embedded Checkout. Kept deliberately: the 5 live [slug] pages
// (about, mens-club, womens-club, sponsors, club-bylaws), plus home, contact,
// and covid-19-rtp-plan (owner: content to preserve / future singleton).
const CANDIDATES = [
  "cart",
  "checkout",
  "calendar",
  "mens-schedule",
  "womens-schedule",
  "mens-standings",
  "womens-standings",
  "social-links",
  "shop",
  "blog",
  "thank-you-tournament-entry",
  "thank-you-site-order",
  "thank-you-donation",
]

// App-router paths that survive deletion of the DatoCMS record: static routes
// in (core)/(checkout) plus the /social-links -> /links redirect target.
const SURVIVING_ROUTES = [
  "cart",
  "checkout",
  "calendar",
  "contact",
  "mens-schedule",
  "womens-schedule",
  "mens-standings",
  "womens-standings",
  "links",
]

// --- DatoCMS CDA --------------------------------------------------------------
async function cdaQuery(query) {
  const res = await fetch("https://graphql.datocms.com/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cdaToken}`,
    },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) {
    throw new Error(`DatoCMS CDA HTTP ${res.status}: ${await res.text()}`)
  }
  const json = await res.json()
  if (json.errors) {
    throw new Error(
      `DatoCMS CDA GraphQL errors: ${JSON.stringify(json.errors)}`
    )
  }
  return json.data
}

// --- Sanity -------------------------------------------------------------------
async function sanityQuery(query) {
  if (!sanityProjectId || !sanityDataset || !sanityToken) {
    console.warn(
      "  (Sanity env vars missing — skipping the Sanity navigation check.)"
    )
    return null
  }
  const res = await fetch(
    `https://${sanityProjectId}.apicdn.sanity.io/v1/data/query/${sanityDataset}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sanityToken}`,
      },
      body: JSON.stringify({ query }),
    }
  )
  if (!res.ok) {
    throw new Error(`Sanity HTTP ${res.status}: ${await res.text()}`)
  }
  const json = await res.json()
  if (json.error) {
    throw new Error(`Sanity query error: ${JSON.stringify(json.error)}`)
  }
  return json.result
}

const navGroq = `*[_type == "navigation"] | order(publishedAt desc) {
  _id,
  publishedAt,
  mainNav[] { item->{_id, title, "slug": slug.current, _type}, customLink, route },
  footerNav[] { item->{_id, title, "slug": slug.current, _type}, customLink, route }
}`

/** Normalize a URL/route/customLink to a bare path for slug comparison. */
function normalizeToPath(value) {
  if (!value) return null
  try {
    // Strip protocol+host so "https://pghrugby.com/contact" -> "/contact"
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
      value = new URL(value).pathname
    }
  } catch {
    /* keep the raw string */
  }
  return value.replace(/^\/+|\/+$/g, "") || null
}

/** Collect candidate slug hits from a navigation record's menu arrays. */
function collectNavHits(menu, hits, docLabel) {
  for (const entry of menu || []) {
    for (const field of ["slug", "route", "customLink"]) {
      const path = normalizeToPath(entry[field])
      if (path && CANDIDATES.includes(path)) {
        hits.push({
          doc: docLabel,
          raw: entry[field],
          field,
          path,
          dangles: !SURVIVING_ROUTES.includes(path),
        })
      }
    }
    if (entry.submenu) collectNavHits(entry.submenu, hits, docLabel)
  }
}

// --- DatoCMS structured-text scan ----------------------------------------------
const LINK_SCAN_FRAGMENT = `links {
  id
  __typename
}`

// Model api_key -> structured-text field that may contain links.
const ST_MODELS = [
  { model: "page", field: "content" },
  { model: "page_old", field: "structuredText" },
  { model: "article", field: "content" },
]

const ST_COLLECTION = {
  page: "allPages",
  page_old: "allPageOlds",
  article: "allArticles",
}

/** Walk a DAST tree and report link nodes (external + record) and inline refs. */
function scanDast(value) {
  const found = []
  const walk = (node) => {
    if (!node || typeof node !== "object") return
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    if (node.type === "link" && node.url)
      found.push({ kind: "url", value: node.url })
    if (node.type === "itemLink" || node.type === "inlineItem") {
      if (node.item) found.push({ kind: "record", value: node.item })
    }
    if (node.children) walk(node.children)
  }
  walk(value)
  return found
}

/** Scan every record of a model's structured text for links to candidates. */
async function scanStructuredText(model, field, candidateById) {
  const collection = ST_COLLECTION[model]
  const hits = []
  let data
  try {
    data = await cdaQuery(`
      query {
        ${collection}(first: 100) {
          id
          title
          slug
          ${field} {
            value
            ${LINK_SCAN_FRAGMENT}
          }
        }
      }
    `)
  } catch (err) {
    console.warn(`  (${model} structured text skipped: ${err.message})`)
    return hits
  }
  for (const record of data[collection] || []) {
    const st = record[field]
    if (!st) continue
    for (const node of scanDast(st.value)) {
      if (node.kind === "record" && candidateById[node.value]) {
        hits.push(
          `${model} "${
            record.title ?? record.slug ?? record.id
          }" links to page ` +
            `"${candidateById[node.value].slug}" (${
              candidateById[node.value].id
            })`
        )
      }
      if (node.kind === "url") {
        const path = normalizeToPath(node.value)
        if (path && CANDIDATES.includes(path)) {
          hits.push(
            `${model} "${record.title ?? record.slug ?? record.id}" links to "${
              node.value
            }"`
          )
        }
      }
    }
    for (const link of st.links || []) {
      if (candidateById[link.id]) {
        hits.push(
          `${model} "${
            record.title ?? record.slug ?? record.id
          }" links to page ` + `"${candidateById[link.id].slug}" (${link.id})`
        )
      }
    }
  }
  return hits
}

// --- main ----------------------------------------------------------------------
const candidateById = {}
const candidatesBySlug = {}
let pageCount = 0
let pageList = []

console.log("Fetching DatoCMS page records…")
{
  const data = await cdaQuery(`
    query {
      allPages(first: 100) { id slug title _status }
    }
  `)
  pageCount = (data.allPages || []).length
  pageList = data.allPages || []
  for (const page of pageList) {
    candidateById[page.id] = page
    if (CANDIDATES.includes(page.slug)) candidatesBySlug[page.slug] = page
  }
}
console.log(
  `  ${pageCount} total page records; ${
    Object.keys(candidatesBySlug).length
  } of ${CANDIDATES.length} candidates found.`
)
console.log(
  "  All page slugs: " +
    pageList
      .map((p) => p.slug)
      .sort()
      .join(", ")
)
for (const slug of CANDIDATES) {
  if (!candidatesBySlug[slug]) {
    console.warn(
      `  ! candidate "${slug}" not found among published pages — nothing to delete (already deleted or draft-only?).`
    )
  }
}

console.log("\n1. Sanity navigation check…")
const navHits = []
{
  const navDocs = await sanityQuery(navGroq)
  if (navDocs) {
    navDocs.forEach((doc, i) => {
      const label = `nav[${i}]${i === 0 ? " (live — latest publishedAt)" : ""}:`
      collectNavHits(doc.mainNav, navHits, label)
      collectNavHits(doc.footerNav, navHits, label)
    })
    console.log(
      navHits.length
        ? "  ! Sanity navigation references to candidates:\n    - " +
            navHits
              .map(
                (h) =>
                  `${h.doc} ${h.raw} (${h.field}) — ${
                    h.dangles
                      ? "would 404 after deletion (BLOCKED)"
                      : "resolves to a surviving static route (OK)"
                  }`
              )
              .join("\n    - ")
        : "  OK — no Sanity navigation records link to candidate slugs."
    )
  }
}

console.log("\n2. DatoCMS structured-text link check…")
const stHits = []
for (const { model, field } of ST_MODELS) {
  stHits.push(...(await scanStructuredText(model, field, candidateById)))
}
console.log(
  stHits.length
    ? `  ! Structured-text links to candidates:\n    - ${stHits.join(
        "\n    - "
      )}`
    : "  OK — no structured-text content links to candidate pages."
)

const deletable = CANDIDATES.filter(
  (slug) =>
    candidatesBySlug[slug] && !navHits.some((h) => h.dangles) && !stHits.length
)
const blockers = stHits.length > 0 || navHits.some((h) => h.dangles)

console.log("\nSummary:")
for (const slug of CANDIDATES) {
  const rec = candidatesBySlug[slug]
  if (!rec) {
    console.log(`  - ${slug}: not found (nothing to delete)`)
  } else if (blockers) {
    console.log(
      `  - ${slug}: BLOCKED — referenced from Sanity nav or DatoCMS structured text`
    )
  } else {
    console.log(`  - ${slug}: verified unused → would delete (${rec.id})`)
  }
}

if (APPLY) {
  if (blockers) {
    console.error(
      "\nAborting: candidates are still referenced. Resolve the links above before deleting."
    )
    process.exit(1)
  }
  if (!cmaToken) {
    console.error(
      "\nDATOCMS_CMA_TOKEN is not set in .env.local — cannot delete. Set it first."
    )
    process.exit(1)
  }
  console.log("\nDeleting via CMA…")

  /** Wait for an async CMA job (deletes return 202 + a job) to finish. */
  async function awaitJob(jobId, slug) {
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 1000))
      const res = await fetch(
        `https://site-api.datocms.com/job-results/${jobId}`,
        {
          headers: {
            Authorization: `Bearer ${cmaToken}`,
            "X-Api-Version": "3",
            Accept: "application/json",
          },
        }
      )
      if (res.status === 404) continue // job result not ready yet
      if (!res.ok) {
        console.error(
          `  ✗ ${slug}: job check HTTP ${res.status} ${await res.text()}`
        )
        process.exit(1)
      }
      const attrs = (await res.json()).data.attributes
      if (attrs.status != null) {
        const errors = attrs.payload?.errors
        if (errors) {
          console.error(
            `  ✗ ${slug}: deletion job failed: ${JSON.stringify(errors)}`
          )
          process.exit(1)
        }
        return
      }
    }
    console.error(`  ✗ ${slug}: deletion job ${jobId} did not finish in time`)
    process.exit(1)
  }

  for (const slug of deletable) {
    const rec = candidatesBySlug[slug]
    const res = await fetch(`https://site-api.datocms.com/items/${rec.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${cmaToken}`,
        "X-Api-Version": "3",
        Accept: "application/json",
      },
    })
    if (!res.ok) {
      const body = await res.text()
      // 404 = already deleted (e.g. by an earlier run) — treat as success.
      if (res.status === 404) {
        console.log(`  ✓ ${slug} (${rec.id}): already deleted`)
        continue
      }
      console.error(`  ✗ ${slug} (${rec.id}): HTTP ${res.status} ${body}`)
      process.exit(1)
    }
    // Destroy is async: 202 with a job. Some calls may return 200 directly.
    const json = await res.json().catch(() => null)
    if (json?.data?.type === "job") {
      await awaitJob(json.data.id, slug)
      console.log(`  ✓ deleted ${slug} (${rec.id})`)
    } else {
      console.log(`  ✓ deleted ${slug} (${rec.id})`)
    }
  }
  console.log(`\nDone — ${deletable.length} page records deleted.`)
} else {
  console.log(
    "\nDry run only. Re-run with --apply to delete. " +
      "Confirm the human checklist (traffic, external links) first."
  )
}
