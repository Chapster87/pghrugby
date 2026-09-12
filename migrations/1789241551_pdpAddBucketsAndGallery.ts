import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { Client } from "datocms/lib/cma-client-node"

/**
 * Forward half of the PDP restructure (docs/agents/datocms-pdp-buckets-migration.md).
 *
 * Replaces the single `page_components` union with three explicit ordered link
 * buckets, adds a page-owned Cloudinary gallery, and adds the product-model
 * fields from the product-model + pricing decisions. Then backfills the four
 * live PDPs from their existing `page_components` order.
 *
 * `page_components` is intentionally left in place — it is dropped by the
 * follow-up migration once the app query has switched and been verified.
 */

// Fixed ids on the Forge Website project (docs/agents/datocms-pdp-buckets-migration.md § 1).
const PDP_MODEL_ID = "InXj3XuhRNSp5BIsjepR_A"
const PRODUCT_MODEL_ID = "LACQ-eAJQjSix9bWWrgdUQ"
const DATA_COLLECTOR_MODEL_ID = "f6LpE7kYTm6R7gJXxbCXlg"

/** The `page.featured_image` Cloudinary Picker shape this gallery mirrors. */
const CLOUDINARY_PICKER_APPEARANCE = {
  addons: [],
  editor: "atgCwfxNQmilTyptBrEE-g",
  parameters: { useAsCloudinaryPicker: null },
  field_extension: "cloudinaryPicker",
}

const FAIL_CASCADE = {
  on_publish_with_unpublished_references_strategy: "fail",
  on_reference_unpublish_strategy: "fail",
  on_reference_delete_strategy: "fail",
} as const

/**
 * Products retired by the SC7s additional-side decision (#71). The legacy
 * manifest still marks them `kind: "addon"`, but they must not be placed.
 */
const RETIRED_SKUS = new Set([
  "sc7s-mens-additional-side",
  "sc7s-womens-additional-side",
])

/** `product_type` for each live PDP (docs/agents/pdp-product-model.md § 4). */
const PRODUCT_TYPE_BY_SLUG: Record<string, string> = {
  dues: "variation",
  donate: "variation",
  "steel-city-7s": "variation",
  "golf-outing": "simple",
}

type PdpRecord = {
  id: string
  slug?: string | null
  page_components?: string[] | null
  primary_products?: string[] | null
  addon_products?: string[] | null
  data_collectors?: string[] | null
  product_type?: string | null
}

type ManifestProduct = { sku: string; kind: "primary" | "addon" }

/** Read the legacy sku → kind guide from the storefront manifest. */
function readManifestKinds(): Record<string, "primary" | "addon"> {
  const raw = readFileSync(
    resolve(process.cwd(), "src/lib/checkout/storefront-catalog.json"),
    "utf8"
  )
  const parsed = JSON.parse(raw) as { products: ManifestProduct[] }
  const kinds: Record<string, "primary" | "addon"> = {}
  for (const product of parsed.products) {
    kinds[product.sku] = product.kind
  }
  return kinds
}

/** Compare a stored link array against the derived one, order included. */
function sameIds(value: unknown, expected: string[]): boolean {
  if (!Array.isArray(value)) return expected.length === 0
  if (value.length !== expected.length) return false
  return value.every((id, index) => id === expected[index])
}

/** Create the schema half: gallery block, PDP buckets, product-type and product fields. */
async function addSchema(client: Client): Promise<void> {
  const galleryItemBlock = await client.itemTypes.create({
    name: "Gallery Item",
    api_key: "gallery_item_block",
    modular_block: true,
  })

  await client.fields.create(galleryItemBlock, {
    label: "Desktop media",
    api_key: "desktop_media",
    field_type: "json",
    hint: "Cloudinary image or video. Video is read from the object's resource_type/format.",
    validators: { required: {} },
    appearance: CLOUDINARY_PICKER_APPEARANCE,
  })

  await client.fields.create(galleryItemBlock, {
    label: "Mobile media",
    api_key: "mobile_media",
    field_type: "json",
    hint: "Optional art-directed crop for small screens; falls back to the desktop media.",
    appearance: CLOUDINARY_PICKER_APPEARANCE,
  })

  await client.fields.create(galleryItemBlock, {
    label: "Alt text",
    api_key: "alt",
    field_type: "string",
    hint: "Cloudinary objects carry no alt text.",
  })

  await client.fields.create(PDP_MODEL_ID, {
    label: "Primary products",
    api_key: "primary_products",
    field_type: "links",
    hint: "The main product(s) this page sells. More than one renders a radio group (pick one). Drag to order.",
    validators: {
      items_item_type: { item_types: [PRODUCT_MODEL_ID], ...FAIL_CASCADE },
      size: { min: 1 },
    },
  })

  await client.fields.create(PDP_MODEL_ID, {
    label: "Add-on products",
    api_key: "addon_products",
    field_type: "links",
    hint: "Optional add-ons sold alongside the primary products. Drag to order.",
    validators: {
      items_item_type: { item_types: [PRODUCT_MODEL_ID], ...FAIL_CASCADE },
    },
  })

  await client.fields.create(PDP_MODEL_ID, {
    label: "Data collectors",
    api_key: "data_collectors",
    field_type: "links",
    hint: "Registration forms shown on the PDP. Drag to order.",
    validators: {
      items_item_type: {
        item_types: [DATA_COLLECTOR_MODEL_ID],
        ...FAIL_CASCADE,
      },
    },
  })

  await client.fields.create(PDP_MODEL_ID, {
    label: "Product type",
    api_key: "product_type",
    field_type: "string",
    hint: "How the primary products are selected: one (simple), one-of-N (variation), or many with quantity (grouped).",
    validators: {
      required: {},
      enum: { values: ["simple", "variation", "grouped"] },
    },
    appearance: {
      addons: [],
      editor: "string_select",
      parameters: {
        options: [
          { label: "Simple", value: "simple" },
          { label: "Variation", value: "variation" },
          { label: "Grouped", value: "grouped" },
        ],
      },
    },
    default_value: "simple",
  })

  await client.fields.create(PDP_MODEL_ID, {
    label: "Gallery",
    api_key: "gallery",
    field_type: "rich_text",
    hint: "Ordered gallery items. Media lives on Cloudinary; no uploads are stored in DatoCMS.",
    validators: {
      rich_text_blocks: { item_types: [galleryItemBlock.id] },
    },
  })

  await client.fields.create(PRODUCT_MODEL_ID, {
    label: "In stock",
    api_key: "in_stock",
    field_type: "boolean",
    hint: "Sold-out products render disabled on the PDP and are rejected server-side at cart build + checkout.",
    default_value: true,
  })

  await client.fields.create(PRODUCT_MODEL_ID, {
    label: "Quantity bearing",
    api_key: "quantity_bearing",
    field_type: "boolean",
    hint: "Whether a cart line for this product renders a quantity control.",
    default_value: false,
  })

  await client.fields.create(PRODUCT_MODEL_ID, {
    label: "Sale price ID",
    api_key: "sale_price_id",
    field_type: "string",
    hint: "Stripe Price id used only while the sale window is open.",
  })

  await client.fields.create(PRODUCT_MODEL_ID, {
    label: "Sale starts at",
    api_key: "sale_starts_at",
    field_type: "date_time",
    hint: "Start of the sale window, in club-local time (America/New_York).",
  })

  await client.fields.create(PRODUCT_MODEL_ID, {
    label: "Sale ends at",
    api_key: "sale_ends_at",
    field_type: "date_time",
    hint: "End of the sale window, in club-local time (America/New_York).",
  })
}

/** Derive the three buckets + product type for every PDP, idempotently. */
async function backfill(client: Client): Promise<void> {
  const kindBySku = readManifestKinds()

  const skuById = new Map<string, string>()
  for await (const product of client.items.listPagedIterator(
    { filter: { type: PRODUCT_MODEL_ID } },
    { perPage: 100, concurrency: 1 }
  )) {
    const sku = (product as { sku?: unknown }).sku
    if (typeof sku === "string" && sku.length > 0) {
      skuById.set(product.id, sku)
    }
  }

  const collectorIds = new Set<string>()
  for await (const collector of client.items.listPagedIterator(
    { filter: { type: DATA_COLLECTOR_MODEL_ID } },
    { perPage: 100, concurrency: 1 }
  )) {
    collectorIds.add(collector.id)
  }

  for await (const raw of client.items.listPagedIterator(
    { filter: { type: PDP_MODEL_ID } },
    { perPage: 100, concurrency: 1 }
  )) {
    const pdp = raw as unknown as PdpRecord
    const components = Array.isArray(pdp.page_components)
      ? pdp.page_components
      : []

    const primary: string[] = []
    const addons: string[] = []
    const collectors: string[] = []

    for (const id of components) {
      const sku = skuById.get(id)
      if (sku) {
        if (RETIRED_SKUS.has(sku)) continue
        if (kindBySku[sku] === "addon") {
          addons.push(id)
        } else {
          primary.push(id)
        }
      } else if (collectorIds.has(id)) {
        collectors.push(id)
      } else {
        console.warn(
          `[pdp-add-buckets] "${
            pdp.slug ?? pdp.id
          }": unknown page_components entry ${id}, skipped`
        )
      }
    }

    const productType = PRODUCT_TYPE_BY_SLUG[String(pdp.slug)] ?? "simple"

    if (
      sameIds(pdp.primary_products, primary) &&
      sameIds(pdp.addon_products, addons) &&
      sameIds(pdp.data_collectors, collectors) &&
      pdp.product_type === productType
    ) {
      console.log(`[pdp-add-buckets] "${pdp.slug}" already backfilled, skipped`)
      continue
    }

    const payload: Record<string, unknown> = {
      primary_products: primary,
      addon_products: addons,
      data_collectors: collectors,
      product_type: productType,
    }

    await client.items.update(pdp.id, payload)
    await client.items.publish(pdp.id)
    console.log(
      `[pdp-add-buckets] "${pdp.slug}": primary=${primary.length} addon=${addons.length} collectors=${collectors.length} type=${productType}`
    )
  }
}

export default async function pdpAddBucketsAndGallery(
  client: Client
): Promise<void> {
  await addSchema(client)
  await backfill(client)
}
