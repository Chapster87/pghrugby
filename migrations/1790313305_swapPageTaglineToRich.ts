import { Client } from "datocms/lib/cma-client-node"

/**
 * Swap `product_detail_page` onto the Structured Text tagline: drop the plain
 * `text` field and give the converted one its name.
 *
 * The lossy half of the pair started by `…_addRichPageTagline`. It is a separate
 * file so the destructive step is reviewable on its own, and it runs only after
 * that migration's values were read back and confirmed (see
 * `docs/pdp-to-minicart-to-checkout-spec.md` § 4.1).
 *
 * Both guards are load-bearing, because a dropped field is not recoverable from the
 * CLI: the converted field must exist, and **every** page that carried a plain
 * tagline must carry a converted one. Without the second check a partially
 * converted project would drop the only copy of the taglines that had not moved.
 *
 * Idempotent: the completed state is recognised by the surviving field already
 * being Structured Text, so a re-run is a no-op rather than a failure.
 */

/** A field as this migration needs to see it. */
type FieldRef = { id: string; api_key: string; field_type: string }

/** A page record as this migration needs to see it. */
type TaglineRecord = {
  id: string
  slug?: string | null
  short_description?: unknown
  short_description_rich?: unknown
}

/** The converted field's name while it exists under its temporary identity. */
const RICH_FIELD_API_KEY = "short_description_rich"

/** Every field of a model, with the type each one carries. */
async function fieldsOf(
  client: Client,
  itemTypeId: string
): Promise<FieldRef[]> {
  const fields = await client.fields.list(itemTypeId)
  return fields.map((field) => ({
    id: field.id,
    api_key: field.api_key,
    field_type: field.field_type,
  }))
}

/** An item type id by api_key, or a loud failure — never a 404 part-way through. */
async function requireItemType(
  client: Client,
  apiKey: string
): Promise<string> {
  const itemTypes = await client.itemTypes.list()
  const id = itemTypes.find((itemType) => itemType.api_key === apiKey)?.id
  if (!id) {
    throw new Error(
      `[swap-page-tagline] model "${apiKey}" not found in this environment`
    )
  }
  return id
}

export default async function swapPageTaglineToRich(
  client: Client
): Promise<void> {
  const pageModelId = await requireItemType(client, "product_detail_page")
  const fields = await fieldsOf(client, pageModelId)

  const current = fields.find((field) => field.api_key === "short_description")
  const converted = fields.find((field) => field.api_key === RICH_FIELD_API_KEY)

  if (current?.field_type === "structured_text") {
    console.log("[swap-page-tagline] page.short_description: already swapped")
    return
  }

  if (!current) {
    throw new Error(
      "[swap-page-tagline] page.short_description is missing — nothing to swap"
    )
  }

  if (!converted) {
    throw new Error(
      `[swap-page-tagline] page.${RICH_FIELD_API_KEY} is missing — run ` +
        "1790313304_addRichPageTagline first"
    )
  }

  const stranded: string[] = []
  for await (const raw of client.items.listPagedIterator(
    { filter: { type: pageModelId } },
    { perPage: 100, concurrency: 1 }
  )) {
    const page = raw as unknown as TaglineRecord
    if (page.short_description && !page.short_description_rich) {
      stranded.push(page.slug ?? page.id)
    }
  }

  if (stranded.length > 0) {
    throw new Error(
      "[swap-page-tagline] refusing to drop page.short_description — still " +
        `unconverted on ${stranded.join(", ")}; re-run the add migration`
    )
  }

  await client.fields.destroy(current.id)

  // The api_key and the label both free up with the drop; a model's labels are
  // unique, so the converted field could not have held this one until now.
  await client.fields.update(converted.id, {
    api_key: "short_description",
    label: "Short description",
    hint: "The tagline under the title, above the option selector. Links and emphasis only — it is one or two lines.",
  })

  console.log("[swap-page-tagline] page.short_description: now Structured Text")
}
