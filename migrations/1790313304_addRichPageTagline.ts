import { Client } from "datocms/lib/cma-client-node"

/**
 * Add a **Structured Text** replacement for `product_detail_page.short_description`,
 * converted from the plain `text` field's values.
 *
 * Why two migrations and not one: a field's type cannot be changed once it
 * exists — the CMA's field-update schema carries `api_key`, `label`, `hint`,
 * `validators`, `localized` and `default_value`, but not `field_type` — so the
 * swap is create → convert → (next migration) drop-and-rename. Splitting it means
 * the lossy half is a separate, reviewable file, and this half is **purely
 * additive**: it creates a field and fills it, and touches nothing the app reads.
 *
 * The conversion is formatting only. Each page's tagline is a sentence or two of
 * plain text, so it becomes the same text inside `span` nodes — no copy is
 * rewritten, and blank-line-separated blocks become separate paragraphs.
 *
 * Idempotent: a page that already has the new field's value is skipped, so a
 * re-run after a partial failure picks up only what is missing.
 *
 * Runs in place on `main` (the project is pre-launch; `--allow-primary`), which is
 * safe **because this file destroys nothing**.
 */

/** A field as this migration needs to see it. */
type FieldRef = { id: string; api_key: string }

/** A page record as this migration needs to see it. */
type TaglineRecord = {
  id: string
  slug?: string | null
  short_description?: string | null
  short_description_rich?: unknown
}

/** This migration's new field. Renamed to `short_description` by the next one. */
const RICH_FIELD_API_KEY = "short_description_rich"

/** Every field of a model. The models here have well under one page of fields. */
async function fieldsOf(
  client: Client,
  itemTypeId: string
): Promise<FieldRef[]> {
  const fields = await client.fields.list(itemTypeId)
  return fields.map((field) => ({ id: field.id, api_key: field.api_key }))
}

/** A model's field id by api_key, or null when it has no such field. */
async function fieldId(
  client: Client,
  itemTypeId: string,
  apiKey: string
): Promise<string | null> {
  const fields = await fieldsOf(client, itemTypeId)
  return fields.find((field) => field.api_key === apiKey)?.id ?? null
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
      `[rich-page-tagline] model "${apiKey}" not found in this environment`
    )
  }
  return id
}

/**
 * A plain-text value as a Structured Text document.
 *
 * Blank-line-separated blocks become paragraphs; single newlines inside a block
 * become spaces, matching how the text field rendered them. Spans are literal, so
 * nothing in the copy is interpreted as markup on the way across.
 */
function toStructuredText(value: string): unknown {
  const paragraphs = value
    .split(/\n\s*\n/)
    .map((block) => block.replace(/\s*\n\s*/g, " ").trim())
    .filter((block) => block.length > 0)

  return {
    schema: "dast",
    document: {
      type: "root",
      children: paragraphs.map((text) => ({
        type: "paragraph",
        children: [{ type: "span", value: text }],
      })),
    },
  }
}

/**
 * Create the Structured Text field, if it is not already there.
 *
 * The editor is restricted to links and inline emphasis: this is a tagline under a
 * page title, so headings, lists, quotes and horizontal rules would let the buy box
 * grow into a document. Record links to pages are allowed because pointing a tagline
 * at membership or registration is the reason for the richer field at all.
 *
 * `structured_text_blocks` is not optional on a Structured Text field — the API
 * rejects the create outright without it — so the empty allow-list is how "no
 * embeds" is stated rather than omitted.
 */
async function createRichTaglineField(
  client: Client,
  pageModelId: string
): Promise<void> {
  if (await fieldId(client, pageModelId, RICH_FIELD_API_KEY)) {
    console.log(
      `[rich-page-tagline] page.${RICH_FIELD_API_KEY}: already present`
    )
    return
  }

  const linkablePageId = await requireItemType(client, "page")

  await client.fields.create(pageModelId, {
    // Temporary: a model's field labels are unique, and the plain-text field this
    // replaces still owns "Short description". The swap migration drops that field
    // first, then renames this one to the same label and api_key.
    label: "Short description (rich)",
    api_key: RICH_FIELD_API_KEY,
    field_type: "structured_text",
    hint: "The tagline under the title, above the option selector. Links and emphasis only — it is one or two lines.",
    validators: {
      structured_text_blocks: { item_types: [] },
      structured_text_links: { item_types: [linkablePageId] },
    },
    appearance: {
      addons: [],
      editor: "structured_text",
      parameters: {
        nodes: ["link"],
        marks: ["strong", "emphasis"],
      },
    },
  })

  console.log(`[rich-page-tagline] page.${RICH_FIELD_API_KEY}: created`)
}

/** Convert every page's plain tagline into the new field. */
async function convertTaglines(
  client: Client,
  pageModelId: string
): Promise<void> {
  const converted: string[] = []

  for await (const raw of client.items.listPagedIterator(
    { filter: { type: pageModelId } },
    { perPage: 100, concurrency: 1 }
  )) {
    const page = raw as unknown as TaglineRecord
    if (!page.short_description || page.short_description_rich) continue

    await client.items.update(page.id, {
      [RICH_FIELD_API_KEY]: toStructuredText(page.short_description),
    })
    await client.items.publish(page.id)
    converted.push(page.slug ?? page.id)
  }

  console.log(
    converted.length > 0
      ? `[rich-page-tagline] ${
          converted.length
        } tagline(s) converted: ${converted.join(", ")}`
      : "[rich-page-tagline] no taglines left to convert"
  )
}

export default async function addRichPageTagline(
  client: Client
): Promise<void> {
  const pageModelId = await requireItemType(client, "product_detail_page")

  await createRichTaglineField(client, pageModelId)
  await convertTaglines(client, pageModelId)
}
