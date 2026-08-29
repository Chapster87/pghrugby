import { buildClient } from "@datocms/cma-client-node"
import dotenv from "dotenv"
import path from "path"

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

async function updateSchema() {
  console.log(
    "Updating storefront schema to ProductDetailPage / DataCollector..."
  )

  // 1. Rename existing models (or create if they don't exist yet)
  // Assuming they exist from previous step, we can use client.itemTypes.update
  // but for simplicity I will just update the API keys/labels if I can.
  // Actually, delete and recreate is cleaner since we haven't seeded data yet.

  const models = await client.itemTypes.list()
  for (const model of models) {
    if (
      [
        "product",
        "flow_group",
        "form",
        "form_field_block",
        "flow_item_block",
      ].includes(model.api_key)
    ) {
      console.log(`Deleting existing model: ${model.api_key}`)
      await client.itemTypes.destroy(model.id)
    }
  }

  // 2. Create new models

  // Data Field (was FormFieldBlock)
  const dataField = await client.itemTypes.create({
    name: "Data Field",
    api_key: "data_field",
    modular_block: true,
  })

  // Data Collector (was Form)
  const dataCollector = await client.itemTypes.create({
    name: "Data Collector",
    api_key: "data_collector",
  })

  // Product
  const productModel = await client.itemTypes.create({
    name: "Product",
    api_key: "product",
  })

  // Product Detail Page (was FlowGroup)
  const productDetailPage = await client.itemTypes.create({
    name: "Product Detail Page",
    api_key: "product_detail_page",
  })

  console.log(
    "Schema updated successfully: Product, ProductDetailPage, DataCollector."
  )
}

updateSchema().catch(console.error)
