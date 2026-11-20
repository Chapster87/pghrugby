import { Client } from "datocms/lib/cma-client-node"

/**
 * Add the `columns_block` block and let the four body fields embed it.
 *
 * One generic block puts content side by side — the case that motivated it is
 * two captioned images, but a column is a Structured Text body, so an image
 * beside a paragraph costs no extra model. The owner's rules decide the shape
 * (map #166):
 *
 * - Two columns, authored as `column_one` and `column_two`. The names are
 *   positional, not semantic: whichever column a thing is authored into dictates
 *   its page order, so there is no `reverse` toggle.
 * - `split` is a select of presets rather than a free number, because every
 *   plausible ratio is a design decision rather than an editorial one.
 * - `gap` is a select too — the spacing between columns is a layout choice the
 *   editor may want, not a constant.
 * - A column may be empty. The empty cell keeps its space: the point of a
 *   columns block is the layout, and a column that collapses when its neighbour
 *   is empty would silently undo the editor's choice.
 * - A column accepts the five embed blocks the body fields already allow and
 *   `page` links, but never `columns_block` itself. Nesting is out of scope, and
 *   excluding the block here is what enforces that.
 *
 * The model is `columns_block`, not `columns`: the CMS rejects a plural api_key
 * with `VALIDATION_PLURAL`, and the `_block` suffix is how the other block
 * models stay singular.
 *
 * The four body fields are `structured_text`, not modular content, so the block
 * is added to their `structured_text_blocks` allow-list. The list is **appended**
 * to, never replaced: each model allows a slightly different set today
 * (`link_button` is homepage and membership only), and rewriting the list from a
 * constant would quietly change that.
 *
 * Purely additive and idempotent: each step looks for its target before acting,
 * so a re-run against an already-migrated environment is a no-op.
 */

/**
 * What a `structured_text` field's create schema accepts.
 *
 * `fields.create` takes a union of per-type schemas, so the validators are
 * narrowed to the Structured Text member rather than left as the full union.
 * That is what lets this migration build one validator object and reuse it for
 * both columns.
 */
type StructuredTextValidators = NonNullable<
  Extract<
    Parameters<Client["fields"]["create"]>[1],
    { field_type: "structured_text" }
  >["validators"]
>

/** The block's model api_key and label in the CMS. */
const BLOCK = { apiKey: "columns_block", name: "Columns" } as const

/**
 * The embed models a column accepts — the same set the bodies allow, except
 * `columns_block`, which is deliberately absent (no nesting).
 */
const COLUMN_BLOCK_API_KEYS = [
  "external_image_block",
  "image_block",
  "image_gallery_block",
  "video_block",
  "link_button",
] as const

/** The models whose body field gains the block. */
const BODY_MODEL_API_KEYS = [
  "page",
  "article",
  "homepage",
  "membership",
] as const

/** A model id by api_key, or null when the project has no such model. */
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
      `[columns-block] model "${apiKey}" not found in this environment`
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

/** Create a field only when the model does not already have it. */
async function ensureField(
  client: Client,
  modelId: string,
  field: Parameters<Client["fields"]["create"]>[1]
): Promise<void> {
  if (await fieldId(client, modelId, field.api_key)) {
    console.log(`[columns-block] ${field.api_key}: already present`)
    return
  }

  await client.fields.create(modelId, field)
  console.log(`[columns-block] ${field.api_key}: created`)
}

/**
 * The validators a column's Structured Text field needs.
 *
 * Both allow-lists are required together by the API's
 * `StructuredTextFieldValidators`, so the five embed models are named by key
 * rather than narrowed by absence — a project missing one is a broken
 * environment, and this migration stops rather than creating half a validator.
 * Links are `page` only, mirroring the bodies and the tab panels.
 */
async function columnValidators(
  client: Client
): Promise<StructuredTextValidators> {
  const blockTypes: string[] = []
  for (const apiKey of COLUMN_BLOCK_API_KEYS) {
    blockTypes.push(await requireItemType(client, apiKey))
  }

  return {
    structured_text_blocks: { item_types: blockTypes },
    structured_text_links: {
      item_types: [await requireItemType(client, "page")],
    },
  }
}

/** A select's appearance, with each option's label and value in step. */
function selectAppearance(
  options: readonly { label: string; value: string }[]
): Parameters<Client["fields"]["create"]>[1]["appearance"] {
  return {
    addons: [],
    editor: "string_select",
    parameters: { options: options.map((option) => ({ ...option })) },
  }
}

/** The layout ratios the block offers, in the order the editor sees them. */
const SPLIT_OPTIONS = [
  { label: "50 / 50", value: "50/50" },
  { label: "60 / 40", value: "60/40" },
  { label: "40 / 60", value: "40/60" },
  { label: "65 / 35", value: "65/35" },
  { label: "35 / 65", value: "35/65" },
] as const

/** The gaps the block offers; the pixel values live in the renderer. */
const GAP_OPTIONS = [
  { label: "None", value: "none" },
  { label: "Small", value: "small" },
  { label: "Medium", value: "medium" },
  { label: "Large", value: "large" },
] as const

/**
 * Create the block and its four fields, or complete an existing one.
 *
 * The two columns share one validator object: they accept exactly the same
 * embeds, and giving them separate ones invites a drift that no renderer
 * expects.
 *
 * @returns the block's item type id, for the body fields' allow-lists.
 */
async function ensureColumnsBlock(client: Client): Promise<string> {
  const existing = await itemTypeId(client, BLOCK.apiKey)
  const blockId =
    existing ??
    (
      await client.itemTypes.create({
        name: BLOCK.name,
        api_key: BLOCK.apiKey,
        modular_block: true,
      })
    ).id

  console.log(
    `[columns-block] ${BLOCK.apiKey}: ${
      existing ? "already present" : "created"
    }`
  )

  const validators = await columnValidators(client)

  await ensureField(client, blockId, {
    label: "Column one",
    api_key: "column_one",
    field_type: "structured_text",
    hint: "The first column's content: prose, images, galleries, video or a link button. May be left empty.",
    validators,
  })

  await ensureField(client, blockId, {
    label: "Column two",
    api_key: "column_two",
    field_type: "structured_text",
    hint: "The second column's content, with the same options as the first. May be left empty.",
    validators,
  })

  await ensureField(client, blockId, {
    label: "Split",
    api_key: "split",
    field_type: "string",
    hint: "How the width is divided between the two columns. Columns stack on narrow screens.",
    validators: {
      enum: { values: SPLIT_OPTIONS.map((option) => option.value) },
    },
    appearance: selectAppearance(SPLIT_OPTIONS),
    default_value: "50/50",
  })

  await ensureField(client, blockId, {
    label: "Gap",
    api_key: "gap",
    field_type: "string",
    hint: "The space between the columns, also used when they stack.",
    validators: { enum: { values: GAP_OPTIONS.map((option) => option.value) } },
    appearance: selectAppearance(GAP_OPTIONS),
    default_value: "medium",
  })

  return blockId
}

/**
 * The embed ids a body field currently allows.
 *
 * Only the field's own validators are read, and only `structured_text_blocks`.
 * `structured_text_links` is left exactly as it is: this migration adds a block,
 * not a link target.
 */
function allowedBlocks(
  validators: StructuredTextValidators | undefined
): string[] {
  return validators?.structured_text_blocks?.item_types ?? []
}

/**
 * Append the block to a model's body field.
 *
 * The existing list is spread back in unchanged. Where the block is already
 * allowed — a re-run, or a model that gained it another way — the field is left
 * alone rather than rewritten.
 */
async function allowColumnsInBody(
  client: Client,
  modelApiKey: string,
  blockId: string
): Promise<void> {
  const modelId = await requireItemType(client, modelApiKey)
  const contentFieldId = await fieldId(client, modelId, "content")
  if (!contentFieldId) {
    throw new Error(
      `[columns-block] model "${modelApiKey}" has no "content" field`
    )
  }

  const field = await client.fields.find(contentFieldId)
  if (field.field_type !== "structured_text") {
    throw new Error(
      `[columns-block] ${modelApiKey}.content is ${field.field_type}, expected structured_text`
    )
  }

  // Narrowed by the guard above: the CMA types give `validators` one union for
  // every field type, and this is the Structured Text member.
  const validators = field.validators as StructuredTextValidators | undefined
  const current = allowedBlocks(validators)

  if (current.includes(blockId)) {
    console.log(
      `[columns-block] ${modelApiKey}.content: already allows columns`
    )
    return
  }

  await client.fields.update(contentFieldId, {
    validators: {
      ...validators,
      structured_text_blocks: { item_types: [...current, blockId] },
    },
  })

  console.log(`[columns-block] ${modelApiKey}.content: allows columns`)
}

export default async function columnsBlock(client: Client): Promise<void> {
  const blockId = await ensureColumnsBlock(client)

  for (const modelApiKey of BODY_MODEL_API_KEYS) {
    await allowColumnsInBody(client, modelApiKey, blockId)
  }
}
