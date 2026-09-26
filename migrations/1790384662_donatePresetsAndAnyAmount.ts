import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { Client } from "datocms/lib/cma-client-node"

import { findCatalogItem } from "../src/lib/checkout/catalog"
import { ANY_AMOUNT, ANY_AMOUNT_SKU } from "../src/lib/checkout/donations"

/**
 * Donations: the preset records, the any-amount record, and the Donate page's
 * dedicated any-amount field (ticket #87).
 *
 * Implements the build work handed off by
 * `docs/agents/donate-pdp-preset-selection.md` and
 * `docs/agents/donations-in-mixed-carts.md` § 4:
 *
 * 1. One `product` record per club preset (`donation-club-preset-10` / `-25` /
 *    `-50`), keyed to the existing Prices on the untouched Stripe `donation-club`
 *    product. Each is `quantity_bearing: false`, `in_stock: true`, no sale window.
 * 2. The `donation-club` record is **repurposed** as the any-amount offering
 *    (`sku` → `donation-club-any`) — the one record the standalone
 *    pay-what-you-want session bills from.
 * 3. A dedicated `any_amount_product` field on `product_detail_page`, outside the
 *    `primary_products` bucket: the any-amount offering is never a cart primary
 *    and never a cart line.
 * 4. The Donate page's `primary_products` reordered to the ladder —
 *    `-10`, `-25`, `-50`, then `donation-pass-the-hat` — with its
 *    `any_amount_product` pointing at the repurposed record.
 *
 * **The any-amount record's `price_id` is the `custom_unit_amount` Price**, which
 * only exists once `pnpm provision:stripe:apply` has minted it (the approval
 * checklist's `donation-club-any` row). This migration reads that id from
 * `DONATION_ANY_AMOUNT_PRICE_ID`; when it is unset the field is left **blank**
 * (and the previous, now-wrong preset id cleared) rather than guessed, so a
 * half-run is a loud 503 on the any-amount route instead of a fixed-price charge.
 * Set the env var and re-run, or paste the id into the record by hand.
 *
 * Authoring only — forking, running and promoting are human gates
 * (`docs/agents/datocms-pdp-buckets-migration.md` § 4). The project has a single
 * environment, `main`, so the run is `--in-place --allow-primary`. Idempotent by
 * construction: every step looks for its target before acting.
 */

/** The `fail` cascades the model's other reference fields carry. */
const FAIL_CASCADE = {
  on_publish_with_unpublished_references_strategy: "fail",
  on_reference_unpublish_strategy: "fail",
  on_reference_delete_strategy: "fail",
} as const

/** The club ladder, ascending — the page's primaries in this order. */
const CLUB_PRESETS = [
  "donation-club-preset-10",
  "donation-club-preset-25",
  "donation-club-preset-50",
] as const

/** The distinct hardship fund, last in the ladder. */
const PASS_THE_HAT_SKU = "donation-pass-the-hat"

/** The record that becomes the any-amount offering. */
const LEGACY_ANY_AMOUNT_SKU = "donation-club"

/** Resolved by api_key before any function below reads them. */
let PDP_MODEL_ID = ""
let PRODUCT_MODEL_ID = ""

/** An item type id by api_key, or null when the project has no such model. */
async function itemTypeId(
  client: Client,
  apiKey: string
): Promise<string | null> {
  const itemTypes = await client.itemTypes.list()
  return itemTypes.find((itemType) => itemType.api_key === apiKey)?.id ?? null
}

/** A model id by api_key, or a loud failure — never a 404 part-way through a run. */
async function requireItemType(
  client: Client,
  apiKey: string
): Promise<string> {
  const id = await itemTypeId(client, apiKey)
  if (!id) {
    throw new Error(
      `[donations] model "${apiKey}" not found in this environment`
    )
  }
  return id
}

/** A model's field id by api_key, or null when it has no such field. */
async function fieldId(
  client: Client,
  modelId: string,
  apiKey: string
): Promise<string | null> {
  const fields = await client.fields.list(modelId)
  return fields.find((field) => field.api_key === apiKey)?.id ?? null
}

/**
 * The minted `custom_unit_amount` Price id, from the environment.
 *
 * The DatoCMS CLI does not reliably load `.env.local`, so — like
 * `provision-stripe-catalog.mjs` and `generate-datocms-schema.mjs` — the file is
 * parsed here as a fallback.
 *
 * @returns The Price id, or null when it has not been supplied.
 */
function anyAmountPriceId(): string | null {
  const fromEnv = process.env.DONATION_ANY_AMOUNT_PRICE_ID
  if (fromEnv && fromEnv.trim()) return fromEnv.trim()

  try {
    const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line.startsWith("DONATION_ANY_AMOUNT_PRICE_ID")) continue
      const eq = line.indexOf("=")
      if (eq === -1) continue
      const value = line
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, "")
      if (value) return value
    }
  } catch {
    // No `.env.local` — the env var alone is the contract.
  }

  return null
}

/**
 * Every product record's sku → id, so each lookup is one pass.
 *
 * @param client - The CMA client for the environment being migrated.
 * @returns The live sku → record-id map.
 */
async function productIdsBySku(client: Client): Promise<Map<string, string>> {
  const bySku = new Map<string, string>()
  for await (const product of client.items.listPagedIterator(
    { filter: { type: PRODUCT_MODEL_ID } },
    { perPage: 100, concurrency: 1 }
  )) {
    const sku = (product as { sku?: unknown }).sku
    if (typeof sku === "string" && sku.length > 0) bySku.set(sku, product.id)
  }
  return bySku
}

/** Whether two id arrays are the same, order included (mirrors the bucket migration). */
function sameIds(value: unknown, expected: string[]): boolean {
  if (!Array.isArray(value)) return expected.length === 0
  if (value.length !== expected.length) return false
  return value.every((id, index) => id === expected[index])
}

/** Create the page's dedicated any-amount field, if it is not already there. */
async function ensureAnyAmountField(client: Client): Promise<void> {
  if (await fieldId(client, PDP_MODEL_ID, "any_amount_product")) {
    console.log("[donations] page.any_amount_product: already present")
    return
  }

  await client.fields.create(PDP_MODEL_ID, {
    label: "Any-amount product",
    api_key: "any_amount_product",
    field_type: "link",
    hint: "The standalone pay-what-you-want offering, rendered as its own control below the primary options. Never a cart primary and never a cart line.",
    validators: {
      item_item_type: { item_types: [PRODUCT_MODEL_ID], ...FAIL_CASCADE },
    },
  })
  console.log("[donations] page.any_amount_product: created")
}

/**
 * Ensure one club preset record exists, keyed to its catalog Price.
 *
 * @param client - The CMA client for the environment being migrated.
 * @param sku - The preset sku, which is also its catalog key and Stripe lookup key.
 * @param bySku - The live sku → record-id map, updated in place as records are created.
 * @returns The record's id.
 */
async function ensurePreset(
  client: Client,
  sku: string,
  bySku: Map<string, string>
): Promise<string> {
  const existing = bySku.get(sku)
  if (existing) {
    console.log(`[donations] preset ${sku}: already present`)
    return existing
  }

  const item = findCatalogItem(sku)
  if (!item) {
    throw new Error(
      `[donations] preset "${sku}" is not in the checkout catalog — catalog.ts and this migration disagree`
    )
  }

  const record = await client.items.create({
    item_type: { type: "item_type", id: PRODUCT_MODEL_ID },
    title: item.label,
    sku,
    price_id: item.priceId ?? null,
    in_stock: true,
    quantity_bearing: false,
  })
  await client.items.publish(record.id)
  bySku.set(sku, record.id)
  console.log(`[donations] preset ${sku}: created`)
  return record.id
}

/**
 * Repurpose the `donation-club` record as the any-amount offering.
 *
 * @param client - The CMA client for the environment being migrated.
 * @param bySku - The live sku → record-id map, updated in place.
 * @returns The record's id, or null when there is nothing to repurpose and no
 *   any-amount record yet — the caller then skips the page's any-amount link.
 */
async function repurposeAnyAmountRecord(
  client: Client,
  bySku: Map<string, string>
): Promise<string | null> {
  const priceId = anyAmountPriceId()

  const already = bySku.get(ANY_AMOUNT_SKU)
  if (already) {
    // Idempotent top-up: a first run may have renamed the record before the Price
    // was minted, so a later run with the env var set completes the job.
    if (!priceId) {
      console.log(
        `[donations] ${ANY_AMOUNT_SKU}: already present (DONATION_ANY_AMOUNT_PRICE_ID not set)`
      )
      return already
    }

    const record = (await client.items.find(already)) as unknown as {
      price_id?: unknown
    }
    if (record.price_id === priceId) {
      console.log(`[donations] ${ANY_AMOUNT_SKU}: already present and priced`)
      return already
    }

    await client.items.update(already, { price_id: priceId })
    await client.items.publish(already)
    console.log(`[donations] ${ANY_AMOUNT_SKU}: Price id set`)
    return already
  }

  const legacyId = bySku.get(LEGACY_ANY_AMOUNT_SKU)
  if (!legacyId) {
    console.warn(
      `[donations] no "${LEGACY_ANY_AMOUNT_SKU}" record to repurpose — create the ${ANY_AMOUNT_SKU} record by hand`
    )
    return null
  }

  if (!priceId) {
    console.warn(
      `[donations] DONATION_ANY_AMOUNT_PRICE_ID is not set — ${ANY_AMOUNT_SKU} keeps a blank Price id until the custom_unit_amount Price is minted and supplied.`
    )
  }

  // `price_id` is set to the custom-amount Price, or cleared when it has not been
  // minted: the record's old price is a *preset*, and leaving it would turn the
  // pay-what-you-want flow into a silent fixed-price charge.
  await client.items.update(legacyId, {
    sku: ANY_AMOUNT_SKU,
    title: ANY_AMOUNT.label,
    price_id: priceId ?? null,
    in_stock: true,
    quantity_bearing: false,
  })
  await client.items.publish(legacyId)

  bySku.delete(LEGACY_ANY_AMOUNT_SKU)
  bySku.set(ANY_AMOUNT_SKU, legacyId)
  console.log(
    `[donations] ${LEGACY_ANY_AMOUNT_SKU} → ${ANY_AMOUNT_SKU}: repurposed${
      priceId ? "" : " (Price id blank)"
    }`
  )
  return legacyId
}

/**
 * Point the Donate page at the new ladder and the any-amount record.
 *
 * The page is found by slug and updated only when something actually differs, so
 * a re-run is a no-op.
 *
 * @param client - The CMA client for the environment being migrated.
 * @param primaryIds - The ladder's record ids, in render order.
 * @param anyAmountId - The any-amount record, or null to leave the link unset.
 */
async function repointDonatePage(
  client: Client,
  primaryIds: string[],
  anyAmountId: string | null
): Promise<void> {
  let pageId: string | null = null
  let currentPrimaries: unknown = null
  let currentAnyAmount: unknown = null

  for await (const raw of client.items.listPagedIterator(
    { filter: { type: PDP_MODEL_ID } },
    { perPage: 100, concurrency: 1 }
  )) {
    const page = raw as unknown as {
      slug?: unknown
      primary_products?: unknown
      any_amount_product?: unknown
    }
    if (page.slug !== "donate") continue
    pageId = raw.id
    currentPrimaries = page.primary_products
    currentAnyAmount = page.any_amount_product
  }

  if (!pageId) {
    console.warn('[donations] no product_detail_page with slug "donate"')
    return
  }

  if (
    sameIds(currentPrimaries, primaryIds) &&
    (currentAnyAmount ?? null) === anyAmountId
  ) {
    console.log('[donations] "donate" already points at the ladder, skipped')
    return
  }

  await client.items.update(pageId, {
    primary_products: primaryIds,
    any_amount_product: anyAmountId,
  })
  await client.items.publish(pageId)
  console.log(
    `[donations] "donate": primaries = ${
      primaryIds.length
    }, any_amount_product = ${anyAmountId ? "set" : "unset"}`
  )
}

export default async function donatePresetsAndAnyAmount(
  client: Client
): Promise<void> {
  PDP_MODEL_ID = await requireItemType(client, "product_detail_page")
  PRODUCT_MODEL_ID = await requireItemType(client, "product")

  await ensureAnyAmountField(client)

  const bySku = await productIdsBySku(client)

  const primaryIds: string[] = []
  for (const sku of CLUB_PRESETS) {
    primaryIds.push(await ensurePreset(client, sku, bySku))
  }

  const passTheHatId = bySku.get(PASS_THE_HAT_SKU)
  if (passTheHatId) {
    primaryIds.push(passTheHatId)
  } else {
    console.warn(
      `[donations] "${PASS_THE_HAT_SKU}" record not found — it will not be a Donate primary`
    )
  }

  if (primaryIds.length === 0) {
    throw new Error("[donations] no primary products resolved — stopping")
  }

  const anyAmountId = await repurposeAnyAmountRecord(client, bySku)

  await repointDonatePage(client, primaryIds, anyAmountId)
}
