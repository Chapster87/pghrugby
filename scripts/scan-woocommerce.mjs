#!/usr/bin/env node
/**
 * Scan the live WooCommerce store for products (incl. out-of-stock and hidden
 * ones) to build the club's approve/deny inventory for the Stripe catalog
 * (wayfinder ticket "Task: Provision the live Stripe store catalog").
 *
 * Tries the authenticated WC v3 REST API first (reads WORDPRESS_APP_USERNAME /
 * WORDPRESS_APP_PASSWORD from .env.local). If that's 401 (WC v3 usually needs
 * consumer keys, not app passwords), falls back to scraping public product
 * pages and parsing the schema.org JSON-LD (name, price, availability).
 *
 * Usage (from pghrugby/nextjs):
 *   node scripts/scan-woocommerce.mjs
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const SITE = "https://pghrugby.com"
// Products that matter for the catalog decision; everything else on the store
// is a one-off fundraiser already ruled out of scope in the catalog spec.
const FOCUS_SLUGS = [
  "dues",
  "dues-fall",
  "dues-spring",
  "dues-summer",
  "team-dues",
  "supporter-dues",
  "golf-outing-registration",
  "golf-outing-ticket",
  "mulligan",
  "golf-outing-all-you-can-drink",
  "golf-outing-sponsorship",
  "steel-city-7s-registration",
  "sc7s-mens-open-division",
  "sc7s-mens-social-division",
  "sc7s-mens-super-social-division",
  "sc7s-womens-open-division",
  "sc7s-womens-social-division",
  "sc7s-mens-additional-side",
  "sc7s-womens-additional-side",
  "club-donation",
  "pass-the-hat",
]

function loadEnvLocal() {
  const path = resolve(import.meta.dirname, "../.env.local")
  const env = {}
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq === -1) continue
    env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "")
  }
  return env
}

async function tryWcApi() {
  const env = loadEnvLocal()
  if (!env.WORDPRESS_APP_USERNAME || !env.WORDPRESS_APP_PASSWORD) return null
  const url = `${SITE}/wp-json/wc/v3/products?per_page=100&page=1&status=any`
  const res = await fetch(url, {
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(`${env.WORDPRESS_APP_USERNAME}:${env.WORDPRESS_APP_PASSWORD}`).toString(
          "base64"
        ),
    },
  })
  if (!res.ok) return null
  return res.json()
}

function unescape(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&#8211;|&ndash;/g, "-")
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/&#8220;|&ldquo;/g, '"')
    .replace(/&#8221;|&rdquo;/g, '"')
    .replace(/&#036;/g, "$")
}

async function scrapeProductPage(slug) {
  const res = await fetch(`${SITE}/product/${slug}`, { redirect: "follow" })
  if (!res.ok) return null
  const html = await res.text()
  const jsonLdMatch = html.match(
    /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g
  )
  if (!jsonLdMatch) return null
  const product = {}
  for (const block of jsonLdMatch) {
    const raw = block.replace(/<\/?script[^>]*>/g, "")
    if (!raw.includes('"@type":"Product"')) continue
    const data = JSON.parse(raw)
    product.name = unescape(data.name ?? "")
    const offers = Array.isArray(data.offers) ? data.offers : [data.offers].filter(Boolean)
    product.offers = offers.map((o) => ({
      price: o.price,
      availability: (o.availability ?? "").replace("https://schema.org/", ""),
      priceValidUntil: o.priceValidUntil,
    }))
  }
  return product
}

const apiProducts = await tryWcApi()
if (apiProducts) {
  console.log("=== WC v3 API (authenticated) ===\n")
  for (const p of apiProducts) {
    const cats = (p.categories ?? []).map((c) => c.name).join(", ")
    console.log(
      `${p.id}\t${p.status}\tstock=${p.stock_status ?? "-"}\t${p.type}\t$${p.price}\t${unescape(p.name)}\t[${cats}]`
    )
  }
} else {
  console.log("=== WC v3 API unauthorized (app password not accepted) — scraping public pages ===\n")
  for (const slug of FOCUS_SLUGS) {
    const page = await scrapeProductPage(slug)
    if (!page) {
      console.log(`- ${slug}\t(page not found)`)
      continue
    }
    const offers = (page.offers ?? [])
      .map((o) => `$${o.price} ${o.availability}${o.priceValidUntil ? ` (valid thru ${o.priceValidUntil})` : ""}`)
      .join(" | ")
    console.log(`- ${slug}\t${page.name}\t${offers}`)
  }
}
