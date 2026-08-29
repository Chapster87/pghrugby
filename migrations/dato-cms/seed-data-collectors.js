import { buildBlockRecord, buildClient } from "@datocms/cma-client-node"
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

const DATA_FIELD_BLOCK_ID = "UP1mkW6XSCWSpFpm9C6iUA" // api_key: data_field (block)
const DATA_COLLECTOR_ID = "f6LpE7kYTm6R7gJXxbCXlg" // api_key: data_collector
const PDP_MODEL_ID = "InXj3XuhRNSp5BIsjepR_A" // api_key: product_detail_page

/** Ensure the block/model carry the locked field shapes (idempotent). */
async function ensureFields() {
  const blockFields = [
    ["label", "Label", "string"],
    ["field_name", "Field name", "string"],
    ["field_type", "Field type", "string"],
    ["required", "Required", "boolean"],
    ["options", "Options", "text"],
    ["placeholder", "Placeholder", "string"],
    ["repeatable", "Repeatable", "boolean"],
    ["max", "Max repeats", "integer"],
  ]
  const existingBlock = await client.fields.list(DATA_FIELD_BLOCK_ID)
  const haveBlock = new Set(existingBlock.map((f) => f.api_key))
  for (const [apiKey, label, fieldType] of blockFields) {
    if (haveBlock.has(apiKey)) continue
    await client.fields.create(DATA_FIELD_BLOCK_ID, {
      label,
      field_type: fieldType,
      api_key: apiKey,
    })
    console.log(`  [block field] added ${apiKey}`)
  }

  const existingCollector = await client.fields.list(DATA_COLLECTOR_ID)
  const haveCollector = new Set(existingCollector.map((f) => f.api_key))
  if (!haveCollector.has("title")) {
    await client.fields.create(DATA_COLLECTOR_ID, {
      label: "Title",
      field_type: "string",
      api_key: "title",
    })
    console.log("  [collector field] added title")
  }
  if (!haveCollector.has("form_fields")) {
    await client.fields.create(DATA_COLLECTOR_ID, {
      label: "Form fields",
      field_type: "rich_text",
      api_key: "form_fields",
      validators: {
        rich_text_blocks: { item_types: [DATA_FIELD_BLOCK_ID] },
      },
    })
    console.log("  [collector field] added form_fields")
  }
}

/** Field spec -> data_field block record (uploaded with the collector record). */
function createFieldBlock(field) {
  return buildBlockRecord({
    item_type: { type: "item_type", id: DATA_FIELD_BLOCK_ID },
    label: field.label,
    field_name: field.fieldName,
    field_type: field.fieldType,
    required: field.required ?? false,
    options: field.options ?? null,
    placeholder: field.placeholder ?? null,
    repeatable: field.repeatable ?? false,
    max: field.max ?? null,
  })
}

/** rich_text field value: the block records themselves (JSON:API item shape). */
function richTextWithBlocks(blocks) {
  return blocks
}

const FORMS = [
  {
    title: "Golf Outing — Captain & players",
    slugKey: "golf-outing",
    fields: [
      {
        label: "Captain name",
        fieldName: "captainName",
        fieldType: "text",
        required: true,
      },
      {
        label: "Captain email",
        fieldName: "captainEmail",
        fieldType: "email",
        required: true,
      },
      {
        label: "Golfer name",
        fieldName: "golfers",
        fieldType: "text",
        required: true,
        repeatable: true,
        max: 8,
      },
    ],
  },
  {
    title: "Steel City 7s — Team & contact",
    slugKey: "steel-city-7s",
    fields: [
      {
        label: "Team name",
        fieldName: "teamName",
        fieldType: "text",
        required: true,
      },
      {
        label: "Contact name",
        fieldName: "contactName",
        fieldType: "text",
        required: true,
      },
      {
        label: "Contact email",
        fieldName: "contactEmail",
        fieldType: "email",
        required: true,
      },
    ],
  },
]

/** Upsert a data_collector record (by title) and return its id. */
async function upsertCollector(form) {
  const blocks = form.fields.map((field) => createFieldBlock(field))

  const existing = await client.items.list({
    "filter[type]": DATA_COLLECTOR_ID,
    "filter[fields][title][eq]": form.title,
  })

  const payload = {
    item_type: { type: "item_type", id: DATA_COLLECTOR_ID },
    title: form.title,
    form_fields: richTextWithBlocks(blocks),
  }

  if (existing.length > 0) {
    await client.items.update(existing[0].id, payload)
    await client.items.publish(existing[0].id)
    console.log(`  [update] ${form.title}`)
    return existing[0].id
  }
  const record = await client.items.create(payload)
  await client.items.publish(record.id)
  console.log(`  [create] ${form.title}`)
  return record.id
}

/** Append the form record to its PDP's page_components. */
async function attachFormToPdp(pdpSlug, collectorId) {
  const existing = await client.items.list({
    "filter[type]": PDP_MODEL_ID,
    "filter[fields][slug][eq]": pdpSlug,
  })
  if (existing.length === 0) {
    console.warn(`  [warn] PDP "${pdpSlug}" not found — form not attached`)
    return
  }
  const pdp = existing[0]
  const components = [...(pdp.page_components ?? [])]
  if (!components.includes(collectorId)) {
    components.push(collectorId)
  }
  await client.items.update(pdp.id, { page_components: components })
  await client.items.publish(pdp.id)
  console.log(`  [attach] form -> /product/${pdpSlug}`)
}

async function seed() {
  console.log("Seeding DataCollector forms...")
  await ensureFields()

  for (const form of FORMS) {
    const collectorId = await upsertCollector(form)
    await attachFormToPdp(form.slugKey, collectorId)
  }

  console.log("\nDone.")
}

seed().catch(console.error)
