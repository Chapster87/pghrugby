import { Client } from "datocms/lib/cma-client-node"

/**
 * Add the vertical-alignment field to the columns block.
 *
 * Two columns rarely hold the same amount of content, and the shorter one has
 * nowhere obvious to sit. Until now the renderer pinned both to the top of the
 * row; this gives the editor the choice of top, middle or bottom.
 *
 * It is one setting for the block rather than one per column: the block is a
 * single layout decision, and two independently aligned columns read as a
 * mistake more often than as intent.
 *
 * Purely additive and idempotent: the field is created only when the model does
 * not already have it, so a re-run is a no-op.
 */

/** The model the field belongs to. */
const MODEL_API_KEY = "columns_block"

/** The values the renderer understands, in the order the editor sees them. */
const OPTIONS = [
  { label: "Top", value: "top" },
  { label: "Middle", value: "middle" },
  { label: "Bottom", value: "bottom" },
] as const

export default async function columnsAlignment(client: Client): Promise<void> {
  const itemTypes = await client.itemTypes.list()
  const model = itemTypes.find((itemType) => itemType.api_key === MODEL_API_KEY)
  if (!model) {
    throw new Error(
      `[columns-align] model "${MODEL_API_KEY}" not found in this environment`
    )
  }

  const fields = await client.fields.list(model.id)
  if (fields.some((field) => field.api_key === "alignment")) {
    console.log("[columns-align] alignment: already present")
    return
  }

  await client.fields.create(model.id, {
    label: "Vertical alignment",
    api_key: "alignment",
    field_type: "string",
    hint: "Where each column's content sits when the other column is taller.",
    validators: { enum: { values: OPTIONS.map((option) => option.value) } },
    appearance: {
      addons: [],
      editor: "string_select",
      parameters: { options: OPTIONS.map((option) => ({ ...option })) },
    },
    default_value: "top",
  })

  console.log("[columns-align] alignment: created")
}
