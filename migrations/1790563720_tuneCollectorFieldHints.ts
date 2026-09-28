import { Client } from "datocms/lib/cma-client-node"

/**
 * Retune the collector field blocks' editor hints.
 *
 * `1790563662_collectorFieldBlocks` created the per-control blocks and wrote their
 * hints for one form's shape: the repeatable hint named "the first person" and the
 * registration quantity, which describes the golf collector rather than the block.
 * The blocks are reusable — any rich-text field accepts them by naming them in its
 * validator — so each hint now describes the control itself: what repeats, what
 * caps it, what an option is.
 *
 * The field-block migration's own copy is corrected in step, so an environment
 * built from scratch lands the same words. This script exists because that
 * migration has **already run** against `main`, and DatoCMS runs a migration once:
 * a corrected copy reaches an existing environment only through a new script.
 *
 * Authoring only — running is a human gate. The project has a single environment,
 * `main`, so the run is `--in-place --allow-primary`. Strictly additive: editor
 * copy only, no field changes api_key, type, validator or default. Idempotent by
 * construction: a field already carrying the wanted hint is skipped.
 */

/** The hints a field block's shared three fields carry. */
const SHARED_HINTS: Record<string, string> = {
  label: "The field's name on the front end, beside its control.",
  field_name: "The key this answer is stored under. Lowercase, no spaces.",
  required:
    "A required field must be answered before the form may be submitted.",
}

/** A free-input block's own fields. */
const FREE_INPUT_HINTS: Record<string, string> = {
  placeholder: "Ghost text inside an empty input.",
  repeatable:
    "Repeats this control — one row per answer. Only a free-input field can repeat.",
  max: "The repeat cap. Only read when the field repeats.",
}

/** A choice block's own fields. */
const CHOICE_HINTS: Record<string, string> = {
  placeholder:
    "Shown before a choice is made. Leave blank for the default prompt.",
  options: "The choices offered, in order. Add one entry per option.",
}

/** The option block, whose one field is the option itself. */
const OPTION_HINTS: Record<string, string> = {
  label: "The option as it is shown — and the value the answer stores.",
}

/** Each block's field hints, by the block's api_key. */
const BLOCK_HINTS: { apiKey: string; hints: Record<string, string> }[] = [
  {
    apiKey: "data_field_text",
    hints: { ...SHARED_HINTS, ...FREE_INPUT_HINTS },
  },
  {
    apiKey: "data_field_textarea",
    hints: { ...SHARED_HINTS, ...FREE_INPUT_HINTS },
  },
  {
    apiKey: "data_field_email",
    hints: { ...SHARED_HINTS, ...FREE_INPUT_HINTS },
  },
  { apiKey: "data_field_select", hints: { ...SHARED_HINTS, ...CHOICE_HINTS } },
  { apiKey: "data_field_radio", hints: { ...SHARED_HINTS, ...CHOICE_HINTS } },
  { apiKey: "data_field_checkbox", hints: SHARED_HINTS },
  { apiKey: "data_field_option", hints: OPTION_HINTS },
]

/** An item type id by api_key, or null when the project has no such model. */
async function itemTypeId(
  client: Client,
  apiKey: string
): Promise<string | null> {
  const itemTypes = await client.itemTypes.list()
  return itemTypes.find((itemType) => itemType.api_key === apiKey)?.id ?? null
}

/**
 * Set one block's hints, skipping any field already carrying the wanted copy.
 *
 * A missing field is a loud failure rather than a skip: it means the field-block
 * migration has not run here, and half-applied copy is worse than a stopped run.
 *
 * @param client - The CMA client for the environment being migrated.
 * @param blockId - The block whose fields are retuned.
 * @param hints - The wanted hint, by field api_key.
 */
async function retuneBlock(
  client: Client,
  blockId: string,
  hints: Record<string, string>
): Promise<void> {
  const fields = await client.fields.list(blockId)

  for (const [apiKey, hint] of Object.entries(hints)) {
    const field = fields.find((candidate) => candidate.api_key === apiKey)
    if (!field) {
      throw new Error(
        `[field-hints] block has no "${apiKey}" field — run the collector field-block migration first`
      )
    }
    if (field.hint === hint) continue
    await client.fields.update(field.id, { hint })
  }
}

export default async function tuneCollectorFieldHints(
  client: Client
): Promise<void> {
  for (const { apiKey, hints } of BLOCK_HINTS) {
    const blockId = await itemTypeId(client, apiKey)
    if (!blockId) {
      throw new Error(
        `[field-hints] model "${apiKey}" not found — run the collector field-block migration first`
      )
    }
    await retuneBlock(client, blockId, hints)
    console.log(`[field-hints] ${apiKey}: hints set`)
  }
}
