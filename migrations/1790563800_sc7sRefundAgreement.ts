import { Client, buildBlockRecord } from "datocms/lib/cma-client-node"

/**
 * Steel City 7s registration: record the buyer's refund-policy acknowledgement
 * (ticket #124).
 *
 * The live WordPress registration stated the entry cancellation policy in the
 * product description — copy the buyer was expected to have read — and the PDP's
 * collector carries no equivalent. Copy alone leaves no *record* that the buyer
 * accepted the term, which is the gap this closes: a required `checkbox` on the
 * collector, snapshotted onto the registration like every other field.
 *
 * The collector ("Steel City 7s — Team & contact") is live content with no
 * migration defining it, so this **appends** rather than rebuilds: the existing
 * fields are read back and written through untouched, and the tick is added only
 * when it is not already there. The golf outing's collector is deliberately left
 * alone — the live WordPress golf product states no refund policy, so there is
 * nothing to acknowledge (`docs/adr/0004-sc7s-refund-agreement-is-a-collector-checkbox.md`).
 *
 * Authoring only — running is the owner's gate. The project has a single
 * environment, `main`, so the run is `--in-place --allow-primary`. Idempotent by
 * construction: a collector already carrying the field is a no-op.
 */

/** The collector the acknowledgement is appended to. */
const COLLECTOR_TITLE = "Steel City 7s — Team & contact"

/** The field's api_key — the key the acknowledgement is stored under. */
const FIELD_NAME = "refundAgreement"

/**
 * The tick's label. The policy text rides in the label itself, so the answer is
 * meaningful even though the PDP's description sits below the fold. The 2026 dates
 * are carried verbatim from the live WordPress copy; the owner re-authors them per
 * tournament.
 */
const FIELD_LABEL =
  "I have read and agree to the refund policy: 75% refund through 11:59 pm 7/5/2026; no refund on or after 7/6/2026."

/** Resolved by api_key before any function below reads it. */
let DATA_COLLECTOR_MODEL_ID = ""
let CHECKBOX_BLOCK_ID = ""

/** An item type id by api_key, or a loud failure — never a 404 part-way through a run. */
async function requireItemType(
  client: Client,
  apiKey: string
): Promise<string> {
  const itemTypes = await client.itemTypes.list()
  const found = itemTypes.find((itemType) => itemType.api_key === apiKey)
  if (!found) {
    throw new Error(
      `[sc7s-refund] model "${apiKey}" not found in this environment`
    )
  }
  return found.id
}

/**
 * A modular-blocks field's value as the block ids it holds.
 *
 * Mirrors `1790563662_collectorFieldBlocks`: the CMA returns a `rich_text` field as
 * an array of block ids, and the object shape an older API version used is
 * tolerated so a read never throws on a shape it merely does not recognise.
 */
function blockIdsOf(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string")
  }
  if (value && typeof value === "object") {
    const blocks = (value as { blocks?: unknown }).blocks
    if (Array.isArray(blocks)) return blockIdsOf(blocks)
  }
  return []
}

/**
 * Append the refund-policy tick to the SC7s collector, unless it is already there.
 *
 * @param client - The CMA client for the environment being migrated.
 */
async function ensureRefundAgreement(client: Client): Promise<void> {
  let collectorId: string | null = null
  let existingIds: string[] = []

  for await (const raw of client.items.listPagedIterator(
    { filter: { type: DATA_COLLECTOR_MODEL_ID } },
    { perPage: 100, concurrency: 1 }
  )) {
    if ((raw as { title?: unknown }).title !== COLLECTOR_TITLE) continue
    collectorId = raw.id
    existingIds = blockIdsOf((raw as Record<string, unknown>).form_fields)
  }

  if (!collectorId) {
    throw new Error(
      `[sc7s-refund] no collector titled "${COLLECTOR_TITLE}" — check the title, and that the field-block migration has run`
    )
  }

  // The collector is known to hold three fields; an empty read means the CMA
  // returned `form_fields` in a shape `blockIdsOf` does not recognise, and
  // appending would drop them. Refuse rather than write a loss.
  if (existingIds.length === 0) {
    throw new Error(
      `[sc7s-refund] collector "${COLLECTOR_TITLE}" read as holding no fields — refusing to append over an unrecognised form_fields shape`
    )
  }

  // Identified by block type *and* field_name, so an unrelated checkbox the owner
  // adds later cannot be mistaken for this one.
  for (const id of existingIds) {
    const block = (await client.items.find(id)) as unknown as {
      item_type?: { id?: string }
      field_name?: unknown
    }
    if (
      block.item_type?.id === CHECKBOX_BLOCK_ID &&
      block.field_name === FIELD_NAME
    ) {
      console.log(
        `[sc7s-refund] collector "${COLLECTOR_TITLE}": already carries "${FIELD_NAME}"`
      )
      return
    }
  }

  const tick = buildBlockRecord({
    item_type: { type: "item_type", id: CHECKBOX_BLOCK_ID },
    label: FIELD_LABEL,
    field_name: FIELD_NAME,
    required: true,
  })

  await client.items.update(collectorId, {
    form_fields: [...existingIds, tick],
  })
  await client.items.publish(collectorId)
  console.log(
    `[sc7s-refund] collector "${COLLECTOR_TITLE}": appended required "${FIELD_NAME}"`
  )
}

export default async function sc7sRefundAgreement(
  client: Client
): Promise<void> {
  DATA_COLLECTOR_MODEL_ID = await requireItemType(client, "data_collector")
  CHECKBOX_BLOCK_ID = await requireItemType(client, "data_field_checkbox")
  await ensureRefundAgreement(client)
}
