import { Client, buildBlockRecord } from "datocms/lib/cma-client-node"

/**
 * Split the collector's `data_field` block into one block per field type (ticket
 * #125, `docs/adr/0003-collector-field-type-is-the-block.md`).
 *
 * The single `data_field` block carried `field_type` plus `options`, `placeholder`,
 * `repeatable` and `max` as a bag of optionals, so every invalid combination was
 * representable and the app absorbed each one silently — a hand-typed `options`
 * value read as a single choice, a `repeatable` `select` degrading to a text box,
 * a typo'd `field_type` falling back to text. It is replaced by six blocks whose
 * *type* is the field type, and a choice's options by a **nested option block**
 * rather than a delimited string.
 *
 * What it lands:
 *
 * 1. Six field blocks — `data_field_text`, `data_field_textarea`,
 *    `data_field_email`, `data_field_select`, `data_field_radio`,
 *    `data_field_checkbox` — each carrying only what its control uses, plus
 *    `data_field_option`, the nested block a choice's `options` holds.
 * 2. `data_collector.form_fields` widened to accept **both** the old block and the
 *    six new ones, then narrowed to the six once every record is converted.
 * 3. The three populated collectors converted in place: Golf Outing — Captain &
 *    players, Steel City 7s — Team & contact, Golf Outing Sponsorship — Business &
 *    contact.
 * 4. `data_field` destroyed, and with it the `field_type` string and the enum
 *    validator #122 added.
 *
 * **Order is the safety property.** The validator widens before any record moves,
 * so a run that fails part-way leaves every collector valid in either shape, and
 * the block is destroyed only after nothing references it. The destroy refuses to
 * act while a single `data_field` block is still reachable.
 *
 * Authoring only — running is a human gate, behind a backup: the project has a
 * single environment, `main`, and no rollback. Idempotent by construction: every
 * step looks for its target before acting, and a collector already holding only
 * the new blocks is skipped.
 */

/** A block's role: what a field block carries, beyond the shared three fields. */
type BlockKind = "free" | "choice" | "checkbox"

/** One field block to create: its api_key, its CMS label, and what it carries. */
type FieldBlockSpec = { apiKey: string; name: string; kind: BlockKind }

/**
 * The six field blocks, in the order the CMS block picker offers them: the free
 * inputs first, then the choices, then the tick.
 */
const FIELD_BLOCKS: FieldBlockSpec[] = [
  { apiKey: "data_field_text", name: "Text field", kind: "free" },
  { apiKey: "data_field_textarea", name: "Text area field", kind: "free" },
  { apiKey: "data_field_email", name: "Email field", kind: "free" },
  { apiKey: "data_field_select", name: "Select field", kind: "choice" },
  { apiKey: "data_field_radio", name: "Radio field", kind: "choice" },
  { apiKey: "data_field_checkbox", name: "Checkbox field", kind: "checkbox" },
]

/** The nested block a choice's `options` field holds, one per option. */
const OPTION_BLOCK = { apiKey: "data_field_option", name: "Choice option" }

/**
 * The old `field_type` value → the block that replaces it.
 *
 * A value outside this map is a loud failure rather than a fallback: the whole
 * point of the split is that an unknown field type stops being renderable, and a
 * conversion that guessed would recreate the silent degradation being removed.
 */
const LEGACY_TYPE_TO_BLOCK: Record<string, string> = {
  text: "data_field_text",
  textarea: "data_field_textarea",
  email: "data_field_email",
  select: "data_field_select",
  radio: "data_field_radio",
  checkbox: "data_field_checkbox",
}

/** Resolved by api_key before any function below reads them. */
let DATA_COLLECTOR_MODEL_ID = ""
let DATA_FIELD_MODEL_ID = ""

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
      `[field-blocks] model "${apiKey}" not found in this environment`
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
 * The shared fields every field block carries.
 *
 * `field_name` is required on all six — it is the key the answer is stored under,
 * and the order-summary readers key off `name` and `label`. DatoCMS modular blocks
 * have no inheritance, so the three are repeated on each block rather than shared.
 */
async function ensureCommonFields(
  client: Client,
  blockId: string
): Promise<void> {
  if (!(await fieldId(client, blockId, "label"))) {
    await client.fields.create(blockId, {
      label: "Label",
      api_key: "label",
      field_type: "string",
      hint: "The field's name on the front end, beside its control.",
      validators: { required: {} },
    })
  }

  if (!(await fieldId(client, blockId, "field_name"))) {
    await client.fields.create(blockId, {
      label: "Field name",
      api_key: "field_name",
      field_type: "string",
      hint: "The key this answer is stored under. Lowercase, no spaces.",
      validators: { required: {} },
    })
  }

  if (!(await fieldId(client, blockId, "required"))) {
    await client.fields.create(blockId, {
      label: "Required",
      api_key: "required",
      field_type: "boolean",
      hint: "A required field must be answered before the form may be submitted.",
      default_value: false,
    })
  }
}

/**
 * The option block a choice's `options` field holds.
 *
 * One field only: the option's label, which is also the value stored in the
 * answers payload. A separate machine value is deliberately not modelled — the
 * stored answer stays the label, exactly as before the split.
 *
 * @returns The option block's item type id, for the choice blocks' validators.
 */
async function ensureOptionBlock(client: Client): Promise<string> {
  const existing = await itemTypeId(client, OPTION_BLOCK.apiKey)
  const blockId =
    existing ??
    (
      await client.itemTypes.create({
        name: OPTION_BLOCK.name,
        api_key: OPTION_BLOCK.apiKey,
        modular_block: true,
      })
    ).id

  console.log(
    `[field-blocks] ${OPTION_BLOCK.apiKey}: ${
      existing ? "already present" : "created"
    }`
  )

  if (!(await fieldId(client, blockId, "label"))) {
    await client.fields.create(blockId, {
      label: "Option",
      api_key: "label",
      field_type: "string",
      validators: { required: {} },
    })
  }

  return blockId
}

/**
 * Create one field block, or complete an existing one.
 *
 * @param client - The CMA client for the environment being migrated.
 * @param spec - The block's api_key, label, and what it carries.
 * @param optionBlockId - The option block a choice's `options` accepts.
 * @returns The block's item type id, for the `form_fields` validator.
 */
async function ensureFieldBlock(
  client: Client,
  spec: FieldBlockSpec,
  optionBlockId: string
): Promise<string> {
  const existing = await itemTypeId(client, spec.apiKey)
  const blockId =
    existing ??
    (
      await client.itemTypes.create({
        name: spec.name,
        api_key: spec.apiKey,
        modular_block: true,
      })
    ).id

  console.log(
    `[field-blocks] ${spec.apiKey}: ${existing ? "already present" : "created"}`
  )

  await ensureCommonFields(client, blockId)

  if (spec.kind === "choice") {
    if (!(await fieldId(client, blockId, "placeholder"))) {
      await client.fields.create(blockId, {
        label: "Placeholder",
        api_key: "placeholder",
        field_type: "string",
        hint: "Shown before a choice is made. Leave blank for the default prompt.",
      })
    }

    if (!(await fieldId(client, blockId, "options"))) {
      await client.fields.create(blockId, {
        label: "Options",
        api_key: "options",
        field_type: "rich_text",
        hint: "The choices a buyer picks from, in the order they are shown. Add one entry per option — at least one.",
        // Restricted to the option block, so an option can never be anything but an
        // option. Note DatoCMS rich-text validators have no `required`, so "at least
        // one option" is guidance rather than a schema constraint: an empty choice
        // stays representable, and the renderer treats it as a control with nothing
        // to control.
        validators: {
          rich_text_blocks: { item_types: [optionBlockId] },
        },
      })
    }
  }

  if (spec.kind === "free") {
    if (!(await fieldId(client, blockId, "placeholder"))) {
      await client.fields.create(blockId, {
        label: "Placeholder",
        api_key: "placeholder",
        field_type: "string",
        hint: "Ghost text inside an empty input.",
      })
    }

    if (!(await fieldId(client, blockId, "repeatable"))) {
      await client.fields.create(blockId, {
        label: "Repeatable",
        api_key: "repeatable",
        field_type: "boolean",
        hint: "Repeats this control — one row per answer. Only a free-input field can repeat.",
        default_value: false,
      })
    }

    if (!(await fieldId(client, blockId, "max"))) {
      await client.fields.create(blockId, {
        label: "Max repeats",
        api_key: "max",
        field_type: "integer",
        hint: "The repeat cap. Only read when the field repeats.",
      })
    }
  }

  return blockId
}

/**
 * Point `data_collector.form_fields` at a set of blocks.
 *
 * Written twice by the run: wide (old block + the six) before any record moves, so
 * a half-converted environment is valid in either shape, then narrow once every
 * record has been converted.
 */
async function pointFormFieldsAt(
  client: Client,
  itemTypes: string[]
): Promise<void> {
  const formFieldsId = await fieldId(
    client,
    DATA_COLLECTOR_MODEL_ID,
    "form_fields"
  )
  if (!formFieldsId) {
    throw new Error(
      '[field-blocks] data_collector has no "form_fields" field — cannot widen it'
    )
  }

  await client.fields.update(formFieldsId, {
    hint: "The fields a buyer fills in, in order. Add a block per field.",
    validators: { rich_text_blocks: { item_types: itemTypes } },
  })
}

/**
 * A modular-blocks field's value as the block ids it holds.
 *
 * The CMA returns a `rich_text` field as an array of block ids; the object shapes
 * an older API version used are tolerated so a read never throws on a shape it
 * merely does not recognise.
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
 * A legacy `data_field.options` value as its option labels.
 *
 * The old field was plain text with an unenforced delimiter. One option per line
 * is the format it was authored in, and a comma-separated value is also read —
 * that is what a hand-typed value looks like, and the live sponsorship collector
 * holds exactly that (`"Yes, No"`). This is the last place the heuristic exists:
 * after the conversion, options are records and nothing splits on a delimiter.
 */
function parseLegacyOptions(value: unknown): string[] {
  const raw = typeof value === "string" ? value : ""
  return raw
    .split(raw.includes("\n") ? /\r?\n/ : ",")
    .map((option) => option.trim())
    .filter(Boolean)
}

/** The fields one legacy `data_field` block carries, as the record read returns them. */
type LegacyBlock = {
  id?: string
  item_type?: { id?: string }
  label?: string | null
  field_name?: string | null
  field_type?: string | null
  required?: boolean | null
  options?: string | null
  placeholder?: string | null
  repeatable?: boolean | null
  max?: number | null
}

/**
 * One legacy `data_field` block as its replacement block record.
 *
 * @param legacy - The block's fields, read from the record.
 * @param blockIdByApiKey - The new blocks' ids, by api_key.
 * @param optionBlockId - The option block's id.
 * @returns The `buildBlockRecord` to write into `form_fields`.
 */
function toReplacementBlock(
  legacy: LegacyBlock,
  blockIdByApiKey: Map<string, string>,
  optionBlockId: string
): unknown {
  const legacyType = String(legacy.field_type ?? "text")
  const apiKey = LEGACY_TYPE_TO_BLOCK[legacyType]
  if (!apiKey) {
    throw new Error(
      `[field-blocks] unrecognised field_type "${legacyType}" — stopping rather than guessing a control`
    )
  }

  const blockId = blockIdByApiKey.get(apiKey)
  if (!blockId) {
    throw new Error(`[field-blocks] block "${apiKey}" was not created`)
  }

  const common = {
    item_type: { type: "item_type" as const, id: blockId },
    label: legacy.label ?? null,
    field_name: legacy.field_name ?? null,
    required: legacy.required === true,
  }

  if (apiKey === "data_field_checkbox") {
    return buildBlockRecord(common)
  }

  if (apiKey === "data_field_select" || apiKey === "data_field_radio") {
    return buildBlockRecord({
      ...common,
      placeholder: legacy.placeholder ?? null,
      options: parseLegacyOptions(legacy.options).map((label) =>
        buildBlockRecord({
          item_type: { type: "item_type" as const, id: optionBlockId },
          label,
        })
      ),
    })
  }

  return buildBlockRecord({
    ...common,
    placeholder: legacy.placeholder ?? null,
    repeatable: legacy.repeatable === true,
    max: typeof legacy.max === "number" ? legacy.max : null,
  })
}

/**
 * Convert every collector still holding `data_field` blocks.
 *
 * A collector whose blocks are all of the new types is skipped, so a re-run is a
 * no-op. The answers payload is untouched: only the field *definitions* move.
 *
 * @returns How many records were converted.
 */
async function convertCollectors(client: Client): Promise<number> {
  const blockIdByApiKey = new Map<string, string>()
  for (const spec of FIELD_BLOCKS) {
    blockIdByApiKey.set(spec.apiKey, await requireItemType(client, spec.apiKey))
  }
  const optionBlockId = await requireItemType(client, OPTION_BLOCK.apiKey)

  let converted = 0

  for await (const raw of client.items.listPagedIterator(
    { filter: { type: DATA_COLLECTOR_MODEL_ID } },
    { perPage: 100, concurrency: 1 }
  )) {
    const record = raw as unknown as { id: string; title?: unknown }
    const blockIds = blockIdsOf((raw as Record<string, unknown>).form_fields)

    // Read each block to learn its item type; a block of the legacy type is what
    // marks this record as unconverted.
    const blocks: LegacyBlock[] = []
    let holdsLegacy = false
    for (const id of blockIds) {
      const block = (await client.items.find(id)) as unknown as LegacyBlock & {
        item_type?: { id?: string }
      }
      if (block.item_type?.id === DATA_FIELD_MODEL_ID) holdsLegacy = true
      blocks.push(block)
    }

    if (!holdsLegacy) {
      console.log(
        `[field-blocks] collector "${String(record.title)}": already converted`
      )
      continue
    }

    const replacements = blocks.map((block) =>
      toReplacementBlock(block, blockIdByApiKey, optionBlockId)
    )

    await client.items.update(record.id, { form_fields: replacements })
    await client.items.publish(record.id)
    converted += 1
    console.log(
      `[field-blocks] collector "${String(record.title)}": converted ${
        replacements.length
      } field(s)`
    )
  }

  return converted
}

/**
 * Report what the destroy is about to take, then take it.
 *
 * A block model carries its instances with it, so an unconverted collector would
 * lose its form here. Nothing is expected — every record is converted above — but
 * the check is a refusal rather than a log line, because the substrate is
 * forward-only and there is no rollback to fall back on.
 */
async function destroyLegacyBlock(client: Client): Promise<void> {
  const legacyId = await itemTypeId(client, "data_field")
  if (!legacyId) {
    console.log("[field-blocks] data_field: already gone")
    return
  }

  for await (const raw of client.items.listPagedIterator(
    { filter: { type: DATA_COLLECTOR_MODEL_ID } },
    { perPage: 100, concurrency: 1 }
  )) {
    const ids = blockIdsOf((raw as Record<string, unknown>).form_fields)
    for (const id of ids) {
      const block = (await client.items.find(id)) as unknown as {
        item_type?: { id?: string }
      }
      if (block.item_type?.id === legacyId) {
        throw new Error(
          `[field-blocks] collector "${
            (raw as { id: string }).id
          }" still holds a data_field block — refusing to destroy it`
        )
      }
    }
  }

  await client.itemTypes.destroy(legacyId)
  console.log("[field-blocks] data_field: destroyed")
}

export default async function collectorFieldBlocks(
  client: Client
): Promise<void> {
  DATA_COLLECTOR_MODEL_ID = await requireItemType(client, "data_collector")
  DATA_FIELD_MODEL_ID = await requireItemType(client, "data_field")

  const optionBlockId = await ensureOptionBlock(client)

  const blockIds: string[] = []
  for (const spec of FIELD_BLOCKS) {
    blockIds.push(await ensureFieldBlock(client, spec, optionBlockId))
  }

  // Wide first: the old block stays valid until every record has moved, so a run
  // that dies part-way leaves every collector readable.
  await pointFormFieldsAt(client, [...blockIds, DATA_FIELD_MODEL_ID])
  console.log("[field-blocks] data_collector.form_fields: widened")

  const converted = await convertCollectors(client)

  // Narrow, then take the old block. The order matters: narrowing while a record
  // still held a `data_field` block would invalidate that collector, and the app's
  // reads exclude invalid records — the form would vanish from the page.
  await pointFormFieldsAt(client, blockIds)
  console.log("[field-blocks] data_collector.form_fields: narrowed")

  await destroyLegacyBlock(client)

  console.log(`[field-blocks] done — ${converted} collector(s) converted`)
}
