import { Client } from "datocms/lib/cma-client-node"

/**
 * Replace the `product_tab` block with two tab blocks.
 *
 * The panel set arrived in `1790305040_reshapeProductCopyAndAddTabs` as one
 * `product_tab` block carrying a `tab` enum (`description` | `includes` |
 * `goodToKnow` | `other`) beside `title` and structured `content`. The enum had
 * exactly one functional role — marking the Description panel, whose body falls
 * back to the primary product's `description` — and on the other three values it
 * only restated what `title` already says. The owner replaced it with two blocks
 * whose *type* carries the meaning (`docs/pdp-to-minicart-to-checkout-spec.md`
 * § 4.7):
 *
 * - **`tab`** — a generic below-fold panel: `title` + `content`, both required.
 * - **`tab_desc`** — the Description panel: the same two fields, with `title`
 *   defaulting to "Description". Where the editor places one it renders **in
 *   place of** the implicit Description panel the renderer otherwise supplies,
 *   and at the position it was dragged to (§ 5.6).
 *
 * Both fields are required on **both** blocks: a tab with no body is a control
 * with nothing to control, and the owner's rule is that the set holds no empty
 * tabs. The implicit Description panel is what covers the rest — a page whose
 * `tabs` field is empty renders the primary product's `description` as one
 * Description tab, or nothing at all when that is empty too.
 *
 * `product_tab` is **destroyed** rather than migrated. Its one behavioural value
 * could not survive the split — the block it lived on is gone — and the owner
 * confirmed no product tabs are in use. Any page still holding `tabs` entries is
 * reported before the destroy, so a loss is visible in the log rather than
 * inferred from silence.
 *
 * Idempotent by construction: every step looks for its target before acting, so
 * a re-run against an already-migrated environment is a no-op. Authoring only —
 * forking, running and promoting are human gates
 * (`docs/agents/datocms-pdp-buckets-migration.md` § 4).
 */

/**
 * The page model, assigned by the entry point before any function below reads it.
 *
 * Resolved by api_key rather than hardcoded, for the reason the reshape migration
 * records: item type ids are per-project trivia, and the ones written down in
 * `docs/agents/datocms-pdp-buckets-migration.md` § 1 were not trustworthy — a
 * wrong `product` id is how that migration failed its first sandbox run.
 */
let PDP_MODEL_ID = ""

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
      `[split-tab-blocks] model "${apiKey}" not found in this environment`
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
 * The structured-text embed models a tab's `content` accepts — the same set the
 * `page`/`article` bodies allow, because the renderer for both is the same
 * `StructuredText` + `renderBlock` switch.
 */
const CONTENT_BLOCK_API_KEYS = [
  "external_image_block",
  "image_block",
  "image_gallery_block",
  "video_block",
] as const

/** The generic below-fold panel. */
const TAB = { apiKey: "tab", name: "Content tab" } as const

/** The Description panel — the one with an implicit twin on the render side. */
const DESC_TAB = {
  apiKey: "tab_desc",
  name: "Description tab",
  titleDefault: "Description",
} as const

/** A tab block's `content` validators: the embeds, and `page` links. */
type ContentValidators = {
  structured_text_blocks: { item_types: string[] }
  structured_text_links: { item_types: string[] }
}

/**
 * The validator set for a tab's `content`.
 *
 * Both allow-lists are **required**, not optional: the API's
 * `StructuredTextFieldValidators` demands `structured_text_blocks` and
 * `structured_text_links` together, so `required` cannot be set on a
 * Structured Text field at all without them. The five models are therefore
 * required by name rather than narrowed by absence — a project missing one is a
 * broken environment, and this migration stops rather than quietly creating a
 * field with half an allow-list.
 *
 * Links are `page` only, mirroring the page body's own Structured Text field.
 */
async function contentValidators(client: Client): Promise<ContentValidators> {
  const blockTypes: string[] = []
  for (const apiKey of CONTENT_BLOCK_API_KEYS) {
    blockTypes.push(await requireItemType(client, apiKey))
  }

  return {
    structured_text_blocks: { item_types: blockTypes },
    structured_text_links: {
      item_types: [await requireItemType(client, "page")],
    },
  }
}

/**
 * Create a tab block, or complete an existing one.
 *
 * One block per panel, with the panel's own title and content, so the set is
 * authored rather than coded. The two blocks differ in exactly two ways: their
 * api_key, and whether `title` carries a default.
 *
 * @param apiKey - the block's api_key, which is also its GraphQL type's stem.
 * @param name - the block's label in the CMS.
 * @param titleDefault - the `title` field's default value, when the block has one.
 * @returns the block's item type id, for the `tabs` field's validator.
 */
async function ensureTabBlock(
  client: Client,
  {
    apiKey,
    name,
    titleDefault,
  }: { apiKey: string; name: string; titleDefault?: string }
): Promise<string> {
  const existing = await itemTypeId(client, apiKey)
  const blockId =
    existing ??
    (
      await client.itemTypes.create({
        name,
        api_key: apiKey,
        modular_block: true,
      })
    ).id

  console.log(
    `[split-tab-blocks] ${apiKey}: ${existing ? "already present" : "created"}`
  )

  if (!(await fieldId(client, blockId, "title"))) {
    await client.fields.create(blockId, {
      label: "Title",
      api_key: "title",
      field_type: "string",
      hint: titleDefault
        ? `The tab's label on the front end. Defaults to "${titleDefault}".`
        : "The tab's label on the front end.",
      validators: { required: {} },
      ...(titleDefault ? { default_value: titleDefault } : {}),
    })
  }

  if (!(await fieldId(client, blockId, "content"))) {
    await client.fields.create(blockId, {
      label: "Content",
      api_key: "content",
      field_type: "structured_text",
      hint: "The panel's body. Embeds are the same ones a page body accepts.",
      // `required` rides alongside the allow-lists: a tab with no body is the
      // empty panel the owner ruled out, so the schema refuses it rather than
      // the render quietly skipping it.
      validators: { required: {}, ...(await contentValidators(client)) },
    })
  }

  return blockId
}

/**
 * Point the page's `tabs` field at the two blocks.
 *
 * The field itself — label, api_key, `rich_text` type — is unchanged. Both what
 * it accepts and its hint move: it takes either block now, and the hint no longer
 * describes the plain-section rule the render has dropped (§ 5.6).
 */
async function pointTabsAtBlocks(
  client: Client,
  blockIds: string[]
): Promise<void> {
  const tabsFieldId = await fieldId(client, PDP_MODEL_ID, "tabs")
  if (!tabsFieldId) {
    throw new Error(
      '[split-tab-blocks] the page has no "tabs" field — run 1790305040 first'
    )
  }

  await client.fields.update(tabsFieldId, {
    hint: "The panels below the fold, in order. Leave empty to show the primary product's description on its own.",
    validators: { rich_text_blocks: { item_types: blockIds } },
  })

  console.log("[split-tab-blocks] page.tabs: accepts tab + tab_desc")
}

/**
 * Whether a record's `tabs` value holds anything.
 *
 * Deliberately tolerant: the CMA returns a `rich_text` field's value in more than
 * one shape across API versions (`{ value, blocks, links }` and the older
 * `{ schema, document, blocks, links }`), and this only feeds a log line. A shape
 * it does not recognise reads as empty, which is the honest answer for a
 * report whose job is to catch the case that matters.
 */
function tabsArePopulated(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0
  if (!value || typeof value !== "object") return false

  const field = value as {
    value?: unknown
    document?: unknown
    children?: unknown
  }

  for (const candidate of [field.document, field.value, field.children]) {
    if (candidate && typeof candidate === "object") {
      const children = (candidate as { children?: unknown }).children
      if (Array.isArray(children) && children.length > 0) return true
    }
  }

  return false
}

/**
 * Report what the destroy is about to take, then take it.
 *
 * A block model carries its instances with it, so a page that did hold a tab
 * would lose it here. Nothing is expected — the owner confirmed no product tabs
 * are in use — but the count is logged anyway, so that a loss is read rather than
 * discovered later.
 */
async function destroyProductTabBlock(client: Client): Promise<void> {
  const productTabId = await itemTypeId(client, "product_tab")
  if (!productTabId) {
    console.log("[split-tab-blocks] product_tab: already gone")
    return
  }

  const pages = await client.items.list({
    filter: { type: "product_detail_page" },
  })
  const populated = pages.filter((page) =>
    tabsArePopulated((page as Record<string, unknown>).tabs)
  )

  if (populated.length > 0) {
    console.warn(
      `[split-tab-blocks] product_tab: ${
        populated.length
      } page(s) still hold tabs, and those panels go with the block: ${populated
        .map((page) => page.id)
        .join(", ")}`
    )
  } else {
    console.log("[split-tab-blocks] product_tab: no page holds a tab")
  }

  await client.itemTypes.destroy(productTabId)
  console.log("[split-tab-blocks] product_tab: destroyed")
}

export default async function replaceProductTabWithTabBlocks(
  client: Client
): Promise<void> {
  PDP_MODEL_ID = await requireItemType(client, "product_detail_page")

  const tabId = await ensureTabBlock(client, TAB)
  const descTabId = await ensureTabBlock(client, DESC_TAB)

  await pointTabsAtBlocks(client, [tabId, descTabId])
  await destroyProductTabBlock(client)
}
