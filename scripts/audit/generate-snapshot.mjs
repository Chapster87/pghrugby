#!/usr/bin/env node
/**
 * Generate the page-audit snapshot and initialize/merge the status file.
 *
 * Fetches the new-site inventory (DatoCMS + static/ForgeCMS routes) and the
 * live WordPress inventory (REST + sitemaps), applies the redirect matcher from
 * #179, pairs mates across sources, and writes:
 *
 *   src/app/(core)/workbench/audit/snapshot.json
 *   src/app/(core)/workbench/audit/status.json
 *
 * The status file is merged, not overwritten: existing rows keep their status,
 * decision, confirmed target, and note; new rows are added as `todo`.
 *
 * Usage (from pghrugby/):
 *   node scripts/audit/generate-snapshot.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, resolve } from "node:path"
import { decode } from "html-entities"

const require = createRequire(import.meta.url)
// The redirect table `next.config.js` serves — imported rather than restated so
// the snapshot can't drift from the redirects actually in effect.
const { getRedirects } = require("../../redirects.js")

const ROOT = resolve(import.meta.dirname, "../..")
const SNAPSHOT_PATH = resolve(
  ROOT,
  "src/app/(core)/workbench/audit/snapshot.json"
)
const STATUS_PATH = resolve(ROOT, "src/app/(core)/workbench/audit/status.json")
const SITE = "https://pghrugby.com"

function loadEnvLocal() {
  const path = resolve(ROOT, ".env.local")
  const env = {}
  if (!existsSync(path)) return env
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq === -1) continue
    env[line.slice(0, eq).trim()] = line
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "")
  }
  return env
}

const env = loadEnvLocal()

async function fetchJson(url, headers = {}) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", ...headers },
  })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

/** Fetch every page of a paginated REST collection. */
async function fetchAll(baseUrl, headers = {}) {
  const out = []
  for (let page = 1; page <= 10; page++) {
    const sep = baseUrl.includes("?") ? "&" : "?"
    const data = await fetchJson(
      `${baseUrl}${sep}per_page=100&page=${page}`,
      headers
    )
    if (!Array.isArray(data) || data.length === 0) break
    out.push(...data)
    if (data.length < 100) break
  }
  return out
}

async function fetchDatoCms() {
  const token = env.DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN
  if (!token) throw new Error("DATOCMS_PUBLISHED_CONTENT_CDA_TOKEN missing")
  const query = `
    query {
      pages: allPages(first: 100) { id slug title }
      articles: allArticles(first: 100) { id slug title }
      pdps: allProductDetailPages(first: 100) { id slug title }
    }
  `
  const res = await fetch("https://graphql.datocms.com/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) throw new Error(`DatoCMS ${res.status}`)
  const json = await res.json()
  if (json.errors) throw new Error(JSON.stringify(json.errors))
  return json.data
}

async function fetchSitemapUrls() {
  const names = [
    "sitemap-misc.xml",
    "page-sitemap.xml",
    "post-sitemap.xml",
    "sp_table-sitemap.xml",
    "calendar-sitemap.xml",
    "productcat-sitemap.xml",
    "producttags-sitemap.xml",
  ]
  const urls = new Set()
  for (const name of names) {
    try {
      const res = await fetch(`${SITE}/${name}`)
      if (!res.ok) continue
      const xml = await res.text()
      for (const match of xml.matchAll(/<loc>(.*?)<\/loc>/g)) {
        urls.add(match[1])
      }
    } catch (error) {
      console.warn(`sitemap ${name} failed: ${error.message}`)
    }
  }
  return [...urls]
}

async function fetchWordPress() {
  const wcAuth =
    env.WORDPRESS_APP_USERNAME && env.WORDPRESS_APP_PASSWORD
      ? "Basic " +
        Buffer.from(
          `${env.WORDPRESS_APP_USERNAME}:${env.WORDPRESS_APP_PASSWORD}`
        ).toString("base64")
      : undefined
  const wcHeaders = wcAuth ? { Authorization: wcAuth } : {}

  const safe = async (label, fn, fallback = []) => {
    try {
      return await fn()
    } catch (error) {
      console.warn(`${label} failed: ${error.message}`)
      return fallback
    }
  }

  const [pages, posts, products, categories, tags] = await Promise.all([
    safe("wp pages", () =>
      fetchAll(`${SITE}/wp-json/wp/v2/pages?status=publish`)
    ),
    safe("wp posts", () =>
      fetchAll(`${SITE}/wp-json/wp/v2/posts?status=publish`)
    ),
    safe("wc products", () =>
      fetchAll(`${SITE}/wp-json/wc/v3/products?status=any`, wcHeaders)
    ),
    safe("wc categories", () =>
      fetchAll(`${SITE}/wp-json/wc/v3/products/categories`, wcHeaders)
    ),
    safe("wc tags", () =>
      fetchAll(`${SITE}/wp-json/wc/v3/products/tags`, wcHeaders)
    ),
  ])

  const spTypes = [
    "events",
    "tables",
    "teams",
    "players",
    "staff",
    "venues",
    "leagues",
    "seasons",
    "calendars",
  ]
  const sp = {}
  for (const type of spTypes) {
    sp[type] = await safe(`sportspress ${type}`, () =>
      fetchAll(`${SITE}/wp-json/sportspress/v2/${type}`)
    )
  }

  return { pages, posts, products, categories, tags, sp }
}

const pathOf = (url) => {
  if (!url) return null
  try {
    const pathname = new URL(url).pathname.replace(/\/$/, "")
    return pathname || "/"
  } catch {
    return null
  }
}

const titleOf = (value) => decode(value ?? "").trim()

function buildNewSiteRows(datocms) {
  const rows = []
  for (const page of datocms.pages) {
    rows.push({
      id: `new:datocms:page:${page.slug}`,
      side: "new",
      source: "datocms",
      type: "page",
      url: `/${page.slug}`,
      title: page.title,
      recordId: page.id,
    })
  }
  for (const article of datocms.articles) {
    rows.push({
      id: `new:datocms:post:${article.slug}`,
      side: "new",
      source: "datocms",
      type: "post",
      url: `/post/${article.slug}`,
      title: article.title,
      recordId: article.id,
    })
  }
  for (const pdp of datocms.pdps) {
    rows.push({
      id: `new:pdp:${pdp.slug}`,
      side: "new",
      source: "datocms",
      type: "pdp",
      url: `/${pdp.slug}`,
      title: pdp.title,
      recordId: pdp.id,
    })
  }

  const staticRoutes = [
    { url: "/", title: "Home" },
    { url: "/cart", title: "Cart" },
    { url: "/contact", title: "Contact Us" },
    { url: "/links", title: "Links" },
    { url: "/membership", title: "Club Membership" },
    { url: "/sitemap", title: "Sitemap" },
    { url: "/styleguide", title: "Style Guide" },
    { url: "/checkout", title: "Checkout" },
    { url: "/checkout/success", title: "Checkout Success" },
  ]
  for (const route of staticRoutes) {
    rows.push({
      id: `new:static:${route.url}`,
      side: "new",
      source: "nextjs",
      type: "static",
      url: route.url,
      title: route.title,
    })
  }

  const forgecmsRoutes = [
    { url: "/matches/all", title: "All Matches" },
    { url: "/mens-schedule", title: "Men's Schedule" },
    { url: "/womens-schedule", title: "Women's Schedule" },
    { url: "/mens-standings", title: "Men's Standings" },
    { url: "/womens-standings", title: "Women's Standings" },
    { url: "/calendar", title: "Calendar" },
  ]
  for (const route of forgecmsRoutes) {
    rows.push({
      id: `new:forgecms:${route.url}`,
      side: "new",
      source: "forgecms",
      type: "forgecms",
      url: route.url,
      title: route.title,
    })
  }

  // One row per addressable URL: a static/ForgeCMS route wins over a DatoCMS
  // page with the same path (e.g. /contact).
  const byUrl = new Map()
  for (const row of rows) {
    const existing = byUrl.get(row.url)
    if (!existing || existing.source === "datocms") byUrl.set(row.url, row)
  }
  return [...byUrl.values()]
}

function buildWordPressRows(wp, sitemapUrls) {
  const rows = []
  const push = (row) => rows.push(row)

  for (const page of wp.pages) {
    const url = pathOf(page.link)
    if (!url) continue
    push({
      id: `wp:page:${url}`,
      side: "wordpress",
      source: "wordpress",
      type: "page",
      url,
      title: titleOf(page.title?.rendered),
      wpId: page.id,
    })
  }
  for (const post of wp.posts) {
    const url = pathOf(post.link)
    if (!url) continue
    push({
      id: `wp:post:${url}`,
      side: "wordpress",
      source: "wordpress",
      type: "post",
      url,
      title: titleOf(post.title?.rendered),
      wpId: post.id,
    })
  }
  for (const product of wp.products) {
    const url = pathOf(product.permalink)
    if (!url) continue
    push({
      id: `wp:product:${url}`,
      side: "wordpress",
      source: "wordpress",
      type: "product",
      url,
      title: titleOf(product.name),
      wpId: product.id,
    })
  }
  for (const category of wp.categories) {
    const url = pathOf(category.link)
    if (!url) continue
    push({
      id: `wp:product-category:${url}`,
      side: "wordpress",
      source: "wordpress",
      type: "product-category",
      url,
      title: titleOf(category.name),
      wpId: category.id,
    })
  }
  for (const tag of wp.tags) {
    const url = pathOf(tag.link)
    if (!url) continue
    push({
      id: `wp:product-tag:${url}`,
      side: "wordpress",
      source: "wordpress",
      type: "product-tag",
      url,
      title: titleOf(tag.name),
      wpId: tag.id,
    })
  }

  const spTypes = {
    events: "event",
    tables: "table",
    teams: "team",
    players: "player",
    staff: "staff",
    venues: "venue",
    leagues: "league",
    seasons: "season",
    calendars: "calendar",
  }
  for (const [collection, type] of Object.entries(spTypes)) {
    for (const item of wp.sp[collection] ?? []) {
      const url = pathOf(item.link)
      if (!url) continue
      push({
        id: `wp:${type}:${url}`,
        side: "wordpress",
        source: "wordpress",
        type,
        url,
        title: titleOf(item.title?.rendered) || url,
        wpId: item.id,
      })
    }
  }

  // Sitemap-only URLs (e.g. /sitemap.html, /calendar/:slug archives).
  const seen = new Set(rows.map((row) => row.url))
  for (const raw of sitemapUrls) {
    const url = pathOf(raw)
    if (!url || seen.has(url)) continue
    seen.add(url)
    push({
      id: `wp:other:${url}`,
      side: "wordpress",
      source: "wordpress",
      type: "other",
      url,
      title: url,
    })
  }

  return rows
}

function buildMatcher(datocms, newSiteRows) {
  const newSiteUrls = new Set(newSiteRows.map((row) => row.url))
  const articleSlugs = new Set(datocms.articles.map((a) => a.slug))
  const catalog = JSON.parse(
    readFileSync(
      resolve(ROOT, "src/lib/checkout/storefront-catalog.json"),
      "utf8"
    )
  )
  const wcToPdp = new Map()
  for (const product of catalog.products) {
    if (product.wcSlug) wcToPdp.set(product.wcSlug, product.pdp)
  }

  const aliases = {
    "/social-links": "/links",
    "/style-guide": "/styleguide",
    "/sitemap.html": "/sitemap",
    "/player/mens-player": "/mens-player",
    "/player/womens-player": "/womens-player",
    "/womens-standings/womens-standing-archive": "/womens-standing-archive",
    "/womens-schedule/womens-schedules-archive": "/womens-schedules-archive",
  }

  return (row) => {
    const url = row.url

    const postMatch = url.match(/^\/blog\/(\d{4})\/(\d{2})\/(\d{2})\/([^/]+)$/)
    if (postMatch) {
      const slug = postMatch[4]
      return articleSlugs.has(slug)
        ? { decision: "redirect", target: `/post/${slug}` }
        : { decision: "undecided" }
    }

    if (
      /^\/blog\/(event|calendar|table|team|player|staff|venue|league|season)\//.test(
        url
      ) ||
      /^\/calendar\//.test(url)
    ) {
      return { decision: "undecided" }
    }

    const productMatch = url.match(/^\/product\/([^/]+)$/)
    if (productMatch) {
      const pdp = wcToPdp.get(productMatch[1])
      return pdp
        ? { decision: "redirect", target: `/${pdp}` }
        : { decision: "undecided" }
    }

    if (/^\/product-(category|tag)\//.test(url)) {
      return { decision: "undecided" }
    }

    if (aliases[url]) {
      return { decision: "redirect", target: aliases[url] }
    }

    if (newSiteUrls.has(url)) {
      return { decision: "keep", target: url }
    }

    return { decision: "undecided" }
  }
}

function attachMates(newSiteRows, wpRows) {
  const newByUrl = new Map(newSiteRows.map((row) => [row.url, row]))
  for (const row of wpRows) {
    const resolved = row.target ?? row.url
    const mate = newByUrl.get(resolved)
    if (mate) {
      row.mateId = mate.id
      row.mateUrl = mate.url
    }
  }
  for (const row of newSiteRows) {
    const mate = wpRows.find((w) => (w.target ?? w.url) === row.url)
    if (mate) {
      row.mateId = mate.id
      row.mateUrl = mate.url
    }
  }
}

async function main() {
  console.log("Fetching DatoCMS…")
  const datocms = await fetchDatoCms()

  console.log("Fetching WordPress…")
  const [wp, sitemapUrls] = await Promise.all([
    fetchWordPress(),
    fetchSitemapUrls(),
  ])

  const newSiteRows = buildNewSiteRows(datocms)
  const wpRows = buildWordPressRows(wp, sitemapUrls)

  const propose = buildMatcher(datocms, newSiteRows)
  for (const row of wpRows) {
    Object.assign(row, propose(row))
  }
  attachMates(newSiteRows, wpRows)

  const catalog = JSON.parse(
    readFileSync(
      resolve(ROOT, "src/lib/checkout/storefront-catalog.json"),
      "utf8"
    )
  )
  const redirects = getRedirects(catalog)

  const snapshot = {
    generatedAt: new Date().toISOString(),
    sources: {
      datocms: newSiteRows.filter((r) => r.source === "datocms").length,
      forgecms: newSiteRows.filter((r) => r.source === "forgecms").length,
      nextjs: newSiteRows.filter((r) => r.source === "nextjs").length,
      wordpress: wpRows.length,
    },
    redirects,
    rows: [...newSiteRows, ...wpRows],
  }

  let statusFile = {
    version: 1,
    updatedAt: new Date().toISOString(),
    rows: {},
  }
  if (existsSync(STATUS_PATH)) {
    statusFile = JSON.parse(readFileSync(STATUS_PATH, "utf8"))
  }
  for (const row of snapshot.rows) {
    if (!statusFile.rows[row.id]) statusFile.rows[row.id] = { status: "todo" }
  }
  statusFile.updatedAt = new Date().toISOString()

  mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true })
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + "\n")
  writeFileSync(STATUS_PATH, JSON.stringify(statusFile, null, 2) + "\n")

  console.log(
    `Wrote ${snapshot.rows.length} rows (${newSiteRows.length} new-site, ${wpRows.length} WordPress).`
  )
  console.log(`Snapshot: ${SNAPSHOT_PATH}`)
  console.log(`Status:   ${STATUS_PATH}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
