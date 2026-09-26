import { Client } from "datocms/lib/cma-client-node"

/**
 * Retire the `donation-pass-the-hat` placeholder (ticket #87, owner's call).
 *
 * The `$1` "Pass the Hat" Fund was never a rung of the donation ladder — it was a
 * placeholder carried over from the WordPress catalog. The ladder is the three
 * club presets (`docs/agents/donations-in-mixed-carts.md` § 2), so this migration
 * finishes the retirement the owner began by hand on the Donate PDP:
 *
 * 1. Drops the record from the Donate page's `primary_products`, if it is still
 *    there. This has to come first: the field's `fail` cascade refuses to
 *    unpublish a record another record still references.
 * 2. **Unpublishes** the `product` record (the archive this project's other
 *    retirement used, and reversible — a delete would not be).
 *
 * Stripe's side is `stripe.products.update(id, { active: false })`, recorded in
 * `docs/agents/stripe-catalog-approval.md`; `catalog.ts`, `storefront-catalog.json`
 * and the round-trip no longer list the sku, so a line for it refuses as
 * `unknown-sku` rather than pricing from a stale entry.
 *
 * Authoring only — running is the owner's gate, and the single-environment rule
 * makes it `--in-place --allow-primary`. Idempotent: every step looks for its
 * target first, and an already-retired placeholder is a no-op.
 */

/** The retired placeholder's sku. */
const RETIRED_SKU = "donation-pass-the-hat"

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
      `[retire-pass-the-hat] model "${apiKey}" not found in this environment`
    )
  }
  return id
}

/**
 * The placeholder's record id, or null when it is already gone.
 *
 * @param client - The CMA client for the environment being migrated.
 * @returns The record's id, or null.
 */
async function findRetiredRecordId(client: Client): Promise<string | null> {
  for await (const product of client.items.listPagedIterator(
    { filter: { type: PRODUCT_MODEL_ID } },
    { perPage: 100, concurrency: 1 }
  )) {
    const sku = (product as { sku?: unknown }).sku
    if (sku === RETIRED_SKU) return product.id
  }
  return null
}

/**
 * Drop the record from the Donate page's primaries, if it is still linked.
 *
 * @param client - The CMA client for the environment being migrated.
 * @param recordId - The placeholder's record id.
 */
async function unlinkFromDonatePage(
  client: Client,
  recordId: string
): Promise<void> {
  for await (const raw of client.items.listPagedIterator(
    { filter: { type: PDP_MODEL_ID } },
    { perPage: 100, concurrency: 1 }
  )) {
    const page = raw as unknown as {
      slug?: unknown
      primary_products?: unknown
    }
    if (page.slug !== "donate") continue

    const primaries = Array.isArray(page.primary_products)
      ? (page.primary_products as string[])
      : []
    if (!primaries.includes(recordId)) {
      console.log('[retire-pass-the-hat] "donate" does not link it, skipped')
      return
    }

    const kept = primaries.filter((id) => id !== recordId)
    if (kept.length === 0) {
      throw new Error(
        '[retire-pass-the-hat] dropping it would leave "donate" with no primary — stopping'
      )
    }

    await client.items.update(raw.id, { primary_products: kept })
    await client.items.publish(raw.id)
    console.log(
      `[retire-pass-the-hat] "donate": primaries = ${kept.length}, unlinked`
    )
    return
  }

  console.warn(
    '[retire-pass-the-hat] no product_detail_page with slug "donate"'
  )
}

/**
 * Unpublish the placeholder record — the archive this project uses for a
 * retired product, and the step that actually takes it off the delivery API.
 *
 * @param client - The CMA client for the environment being migrated.
 * @param recordId - The placeholder's record id.
 */
async function archiveRecord(client: Client, recordId: string): Promise<void> {
  const record = (await client.items.find(recordId)) as unknown as {
    meta?: { status?: string }
  }
  if (record.meta?.status !== "published") {
    console.log("[retire-pass-the-hat] record already unpublished")
    return
  }

  await client.items.unpublish(recordId)
  console.log("[retire-pass-the-hat] record unpublished (archived)")
}

export default async function retirePassTheHatPlaceholder(
  client: Client
): Promise<void> {
  PDP_MODEL_ID = await requireItemType(client, "product_detail_page")
  PRODUCT_MODEL_ID = await requireItemType(client, "product")

  const recordId = await findRetiredRecordId(client)
  if (!recordId) {
    console.log(
      `[retire-pass-the-hat] no "${RETIRED_SKU}" record, nothing to do`
    )
    return
  }

  await unlinkFromDonatePage(client, recordId)
  await archiveRecord(client, recordId)
}
