import { buildClient } from "@datocms/cma-client-node"
import dotenv from "dotenv"
import path from "path"
import axios from "axios"
import { readFileSync } from "node:fs"
import { decode } from "html-entities"

// Load from project root
dotenv.config({ path: path.resolve(process.cwd(), "../../.env.local") })

const DATOCMS_API_TOKEN =
  process.env.DATACMA_FULL_API_TOKEN || process.env.DATOCMS_API_TOKEN
const DATOCMS_ENVIRONMENT = process.env.DATOCMS_ENVIRONMENT || "main"
const WORDPRESS_URL = process.env.WORDPRESS_URL || "https://pghrugby.com"

if (!DATOCMS_API_TOKEN) {
  console.error("DATOCMS_API_TOKEN missing.")
  process.exit(1)
}

const client = buildClient({
  apiToken: DATOCMS_API_TOKEN,
  environment: DATOCMS_ENVIRONMENT,
})

// Single source of truth: the Stripe catalog manifest (sku -> WC slug -> flow).
const manifest = JSON.parse(
  readFileSync(
    path.resolve(
      process.cwd(),
      "../../src/lib/checkout/storefront-catalog.json"
    ),
    "utf8"
  )
)

const PRODUCT_MODEL_ID = "LACQ-eAJQjSix9bWWrgdUQ" // api_key: product

/** Strip HTML tags + decode entities for plain-text DatoCMS fields. */
function htmlToPlainText(html) {
  if (!html) return null
  return decode(html.replace(/<[^>]*>/g, "").trim()) || null
}

/** Ensure the product model carries the locked editorial fields. */
async function ensureFields() {
  const existing = await client.fields.list(PRODUCT_MODEL_ID)
  const have = new Set(existing.map((f) => f.api_key))

  const add = async (apiKey, label, fieldType) => {
    if (have.has(apiKey)) return
    await client.fields.create(PRODUCT_MODEL_ID, {
      label,
      field_type: fieldType,
      api_key: apiKey,
    })
    console.log(`  [field] added ${apiKey}`)
  }

  await add("short_description", "Short description", "text")
  await add("long_description", "Long description", "text")
  await add("price_id", "Price ID (override)", "string")
}

/** Fetch all WooCommerce products once, indexed by slug. */
async function fetchWcProducts() {
  const auth = {
    username: process.env.WORDPRESS_APP_USERNAME,
    password: process.env.WORDPRESS_APP_PASSWORD,
  }
  const response = await axios.get(
    `${WORDPRESS_URL}/wp-json/wc/v3/products?per_page=100`,
    { auth }
  )
  const bySlug = new Map()
  for (const p of response.data) bySlug.set(p.slug, p)
  console.log(`[wc] fetched ${bySlug.size} products`)
  return bySlug
}

/** Delete every existing product record not in the manifest (out-of-scope + WC-slug duplicates). */
async function deleteNonCatalogRecords(catalogSkus) {
  const items = await client.items.list({
    "filter[type]": PRODUCT_MODEL_ID,
    "page[limit]": 100,
  })
  let deleted = 0
  for (const item of items) {
    if (!catalogSkus.has(item.sku)) {
      await client.items.destroy(item.id)
      deleted++
      console.log(`  [delete] ${item.id} (sku: ${item.sku ?? "?"})`)
    }
  }
  console.log(`[cleanup] deleted ${deleted} non-catalog records`)
}

async function seedProducts() {
  console.log("Seeding Stripe catalog products from WooCommerce...")

  await ensureFields()

  const wcBySlug = await fetchWcProducts()
  const catalogSkus = new Set(manifest.products.map((p) => p.sku))

  await deleteNonCatalogRecords(catalogSkus)

  let created = 0
  let updated = 0
  for (const entry of manifest.products) {
    const { sku, label, wcSlug } = entry
    const wc = wcSlug ? wcBySlug.get(wcSlug) : null

    if (wcSlug && !wc) {
      console.warn(
        `  [warn] no WC product for slug "${wcSlug}" (sku ${sku}) — seeding label only`
      )
    }

    const payload = {
      item_type: { type: "item_type", id: PRODUCT_MODEL_ID },
      title: wc?.name ? decode(wc.name) : label,
      sku,
      short_description: htmlToPlainText(wc?.short_description),
      long_description: htmlToPlainText(wc?.description),
      // price_id intentionally left blank — the sku -> price seam resolves
      // current prices from catalog.ts at session-build time.
    }

    const existing = await client.items.list({
      "filter[type]": PRODUCT_MODEL_ID,
      "filter[fields][sku][eq]": sku,
    })

    if (existing.length > 0) {
      await client.items.update(existing[0].id, payload)
      await client.items.publish(existing[0].id)
      updated++
      console.log(`  [update] ${sku} (${payload.title})`)
    } else {
      const record = await client.items.create(payload)
      await client.items.publish(record.id)
      created++
      console.log(`  [create] ${sku} (${payload.title})`)
    }
  }

  console.log(`\nDone — ${created} created, ${updated} updated.`)
}

seedProducts().catch(console.error)
