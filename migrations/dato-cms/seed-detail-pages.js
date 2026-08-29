import { buildClient } from "@datocms/cma-client-node"
import dotenv from "dotenv"
import path from "path"
import { readFileSync } from "node:fs"

// Load from project root
dotenv.config({ path: path.resolve(process.cwd(), "../../.env.local") })

const DATOCMS_API_TOKEN =
  process.env.DATACMA_FULL_API_TOKEN || process.env.DATOCMS_API_TOKEN
const DATOCMS_ENVIRONMENT = process.env.DATOCMS_ENVIRONMENT || "main"

if (!DATOCMS_API_TOKEN) {
  console.error("DATOCMS_API_TOKEN missing.")
  process.exit(1)
}

const client = buildClient({
  apiToken: DATOCMS_API_TOKEN,
  environment: DATOCMS_ENVIRONMENT,
})

// Single source of truth: the Stripe catalog manifest (flows + products).
const manifest = JSON.parse(
  readFileSync(
    path.resolve(process.cwd(), "../../src/lib/checkout/storefront-catalog.json"),
    "utf8"
  )
)

const PRODUCT_MODEL_ID = "LACQ-eAJQjSix9bWWrgdUQ" // api_key: product
const PDP_MODEL_ID = "InXj3XuhRNSp5BIsjepR_A" // api_key: product_detail_page

async function seedPdps() {
  console.log("Seeding ProductDetailPage records from the manifest...")

  // Map sku -> DatoCMS product record id (manifest order is the curated order).
  const productItems = await client.items.list({
    "filter[type]": PRODUCT_MODEL_ID,
    "page[limit]": 100,
  })
  const skuToId = new Map(productItems.map((p) => [p.sku, p.id]))

  for (const flow of manifest.flows) {
    const productIds = manifest.products
      .filter((p) => p.pdp === flow.slug)
      .map((p) => skuToId.get(p.sku))
      .filter(Boolean)

    if (productIds.length === 0) {
      console.warn(`  [warn] no products for PDP "${flow.slug}" — skipping`)
      continue
    }

    const payload = {
      item_type: { type: "item_type", id: PDP_MODEL_ID },
      title: flow.title,
      slug: flow.slug,
      page_components: productIds,
    }

    const existing = await client.items.list({
      "filter[type]": PDP_MODEL_ID,
      "filter[fields][slug][eq]": flow.slug,
    })

    if (existing.length > 0) {
      await client.items.update(existing[0].id, payload)
      await client.items.publish(existing[0].id)
      console.log(
        `  [update] ${flow.slug} — ${flow.title} (${productIds.length} products)`
      )
    } else {
      const record = await client.items.create(payload)
      await client.items.publish(record.id)
      console.log(
        `  [create] ${flow.slug} — ${flow.title} (${productIds.length} products)`
      )
    }
  }

  console.log("\nDone.")
}

seedPdps().catch(console.error)
