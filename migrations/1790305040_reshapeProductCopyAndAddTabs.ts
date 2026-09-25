import { Client } from "datocms/lib/cma-client-node"

/**
 * Reshape the PDP copy model and add the authored tab system.
 *
 * Three coupled changes, in one migration because the second is only safe once
 * the first has landed:
 *
 * 1. **Product copy collapses to one field.** `product.long_description` is
 *    renamed to `product.description`; `product.short_description` is dropped.
 *    Its copy was per-variant — one line per SC7s division, one per dues season —
 *    and for those pages the row already carries the same facts (the catalog
 *    label names the variant, `LinePrice` renders the amount), so it is dropped
 *    rather than aged into a single page string. The decision, and the two
 *    alternatives rejected, are in `docs/pdp-to-minicart-to-checkout-spec.md`
 *    § 4.3.
 * 2. **The page owns the tagline.** `product_detail_page.short_description` is
 *    created and backfilled from the page's existing `description`, which is then
 *    dropped. Order matters: the new field is created *and populated* before the
 *    old one goes, so the copy is never only in this process's memory.
 * 3. **The panel set becomes authorable.** A `product_tab` modular block
 *    (`tab` enum + `title` + structured `content`) plus a page `tabs` field
 *    restricted to it. Whatever the editor populates becomes a panel (§ 5.6).
 *
 * Plus two optional page fields the event PDPs need — `event_starts_at` and
 * `event_location` — rendered as one meta line under the title (§ 5.1).
 *
 * Idempotent by construction: every step looks for its target before acting, so
 * a re-run against an already-migrated environment is a no-op. Authoring only —
 * forking, running, and promoting are human gates
 * (`docs/agents/datocms-pdp-buckets-migration.md` § 4).
 */

// Fixed ids on the Forge Website project (docs/agents/datocms-pdp-buckets-migration.md § 1).
const PDP_MODEL_ID = "InXj3XuhRNSp5BIsjepR_A"
const PRODUCT_MODEL_ID = "LACQ-eAJQjSi9bWWrgdUQ"

/**
 * The structured-text embed models `product_tab.content` accepts — the same set
 * the `page`/`article` bodies already allow, because the renderer for both is the
 * same `StructuredText` + `renderBlock` switch.
 */
const CONTENT_BLOCK_API_KEYS = [
  "external_image_block",
  "image_block",
  "image_gallery_block",
  "video_block",
] as const

/**
 * `product_tab.tab`'s enum. Only `description` changes behaviour: it is the tab
 * whose panel falls back to the primary product's `description` when its own
 * `content` is empty (§ 5.6). `title` is the visible label for every tab, so the
 * other three are a filing aid for the editor.
 */
const TAB_KINDS = [
  { label: "Description", value: "description" },
  { label: "Includes", value: "includes" },
  { label: "Good to know", value: "goodToKnow" },
  { label: "Other", value: "other" },
] as const

/** A field as this migration needs to see it. */
type FieldRef = { id: string; api_key: string }

/** A record as this migration needs to see it. */
type CopyRecord = {
  id: string
  sku?: string | null
  slug?: string | null
  description?: string | null
  short_description?: string | null
}

/** Every field of a model. Models here have well under one page of fields. */
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

/** An item type id by api_key, or null when the project has no such model. */
async function itemTypeId(
  client: Client,
  apiKey: string
): Promise<string | null> {
  const itemTypes = await client.itemTypes.list()
  return itemTypes.find((itemType) => itemType.api_key === apiKey)?.id ?? null
}

/**
 * Rename `product.long_description` to `product.description`.
 *
 * A rename, not create-and-copy: the field is populated on every product, and
 * renaming keeps the values attached. If the environment already has
 * `description` there is nothing to do — which is also the post-run state, so a
 * re-run is a no-op.
 *
 * If the CMA refuses an `api_key` change (it is editable in the DatoCMS UI, so it
 * should not) the fallback is create `description` → copy values → destroy
 * `long_description`; that is a code change here, not a data change, and the
 * dry-run is where it would surface.
 */
async function renameProductDescription(client: Client): Promise<void> {
  const legacy = await fieldId(client, PRODUCT_MODEL_ID, "long_description")
  if (!legacy) {
    console.log("[reshape-pdp-copy] product.long_description: already renamed")
    return
  }

  if (await fieldId(client, PRODUCT_MODEL_ID, "description")) {
    throw new Error(
      "[reshape-pdp-copy] product has both description and long_description — " +
        "resolve by hand before running; a rename here would collide"
    )
  }

  await client.fields.update(legacy, {
    api_key: "description",
    label: "Description",
    hint: "The product's full copy. Renders below the fold, and is the fallback for a Description-typed tab with no content of its own.",
  })
  console.log("[reshape-pdp-copy] product.long_description → description")
}

/**
 * Create the page's `short_description` and move the page `description` copy
 * into it.
 *
 * The page's `description` is where the live taglines already live, so this is a
 * move rather than an authoring task. Records are republished as they are
 * written: without the publish the value exists but the Content Delivery API
 * still serves the old record.
 *
 * The copy pass runs on **every** invocation, not only when the field is created:
 * a run interrupted between the field creation and the copy would otherwise
 * re-enter, find the field present, skip the copy — and leave the drop below to
 * discard taglines that never moved.
 */
async function createPageShortDescription(client: Client): Promise<void> {
  if (await fieldId(client, PDP_MODEL_ID, "short_description")) {
    console.log("[reshape-pdp-copy] page.short_description: already present")
  } else {
    await client.fields.create(PDP_MODEL_ID, {
      label: "Short description",
      api_key: "short_description",
      field_type: "text",
      hint: "The tagline under the title, above the option selector. One or two lines.",
    })
    console.log("[reshape-pdp-copy] page.short_description: created")
  }

  const moved: string[] = []
  for await (const raw of client.items.listPagedIterator(
    { filter: { type: PDP_MODEL_ID } },
    { perPage: 100, concurrency: 1 }
  )) {
    const page = raw as unknown as CopyRecord
    if (!page.description || page.short_description) continue

    await client.items.update(page.id, { short_description: page.description })
    await client.items.publish(page.id)
    moved.push(page.slug ?? page.id)
  }

  console.log(
    moved.length > 0
      ? `[reshape-pdp-copy] ${moved.length} tagline(s) moved: ${moved.join(
          ", "
        )}`
      : "[reshape-pdp-copy] no taglines left to move"
  )
}

/**
 * Drop the page's `description`.
 *
 * Guarded twice, because dropping a field is not reversible from the CLI: the new
 * field must exist, and *every* page carrying a `description` must have carried it
 * across. The second check is what makes an interrupted copy safe — without it a
 * half-moved run would drop the only copy of the taglines it failed to move.
 */
async function dropPageDescription(client: Client): Promise<void> {
  const legacy = await fieldId(client, PDP_MODEL_ID, "description")
  if (!legacy) {
    console.log("[reshape-pdp-copy] page.description: already dropped")
    return
  }

  if (!(await fieldId(client, PDP_MODEL_ID, "short_description"))) {
    throw new Error(
      "[reshape-pdp-copy] refusing to drop page.description before " +
        "page.short_description exists — the tagline copy would be lost"
    )
  }

  const stranded: string[] = []
  for await (const raw of client.items.listPagedIterator(
    { filter: { type: PDP_MODEL_ID } },
    { perPage: 100, concurrency: 1 }
  )) {
    const page = raw as unknown as CopyRecord
    if (page.description && !page.short_description) {
      stranded.push(page.slug ?? page.id)
    }
  }

  if (stranded.length > 0) {
    throw new Error(
      "[reshape-pdp-copy] refusing to drop page.description — still unmoved on " +
        `${stranded.join(", ")}; re-run so the copy pass picks them up`
    )
  }

  await client.fields.destroy(legacy)
  console.log("[reshape-pdp-copy] page.description: dropped")
}

/**
 * Drop `product.short_description`, logging the copy it takes with it.
 *
 * The values are printed rather than moved: they are per-variant, while the
 * replacement is one string per page, so there is no faithful destination. The
 * log is the audit trail — the same strings remain readable in
 * `migrations/dato-cms/fill-product-editorial.js` and `seed-products.js`.
 */
async function dropProductShortDescription(client: Client): Promise<void> {
  const legacy = await fieldId(client, PRODUCT_MODEL_ID, "short_description")
  if (!legacy) {
    console.log("[reshape-pdp-copy] product.short_description: already dropped")
    return
  }

  for await (const raw of client.items.listPagedIterator(
    { filter: { type: PRODUCT_MODEL_ID } },
    { perPage: 100, concurrency: 1 }
  )) {
    const product = raw as unknown as CopyRecord
    if (!product.short_description) continue
    console.log(
      `[reshape-pdp-copy]   dropping ${product.sku ?? product.id}: "${
        product.short_description
      }"`
    )
  }

  await client.fields.destroy(legacy)
  console.log("[reshape-pdp-copy] product.short_description: dropped")
}

/**
 * Create the `product_tab` block, or complete an existing one.
 *
 * One block per tab, with the tab's own title and content, so the panel set is
 * authored rather than coded. `content` is Structured Text, which means it can
 * carry the same embeds as a page body.
 *
 * @returns the block's item type id, for the `tabs` field's validator.
 */
async function ensureProductTabBlock(client: Client): Promise<string> {
  const existing = await itemTypeId(client, "product_tab")
  const blockId =
    existing ??
    (
      await client.itemTypes.create({
        name: "Product Tab",
        api_key: "product_tab",
        modular_block: true,
      })
    ).id

  if (existing) {
    console.log("[reshape-pdp-copy] product_tab: already present")
  } else {
    console.log("[reshape-pdp-copy] product_tab: created")
  }

  if (!(await fieldId(client, blockId, "tab"))) {
    await client.fields.create(blockId, {
      label: "Tab",
      api_key: "tab",
      field_type: "string",
      hint: "Which panel this is. Only Description behaves differently: with no content of its own it falls back to the primary product's description.",
      validators: {
        required: {},
        enum: { values: TAB_KINDS.map((kind) => kind.value) },
      },
      appearance: {
        addons: [],
        editor: "string_select",
        parameters: { options: TAB_KINDS.map((kind) => ({ ...kind })) },
      },
      default_value: "description",
    })
  }

  if (!(await fieldId(client, blockId, "title"))) {
    await client.fields.create(blockId, {
      label: "Title",
      api_key: "title",
      field_type: "string",
      hint: "The tab's label on the front end. Populate it and the tab renders.",
      validators: { required: {} },
    })
  }

  if (!(await fieldId(client, blockId, "content"))) {
    const blockTypes: string[] = []
    for (const apiKey of CONTENT_BLOCK_API_KEYS) {
      const id = await itemTypeId(client, apiKey)
      if (id) {
        blockTypes.push(id)
      } else {
        console.warn(
          `[reshape-pdp-copy] block model "${apiKey}" not found; excluded from product_tab.content`
        )
      }
    }

    // `structured_text_links` is required by the API whenever `validators` is
    // present, so a record link needs an allow-list too. `page` only, mirroring
    // the page body's own Structured Text field.
    const linkTypes: string[] = []
    const pageModelId = await itemTypeId(client, "page")
    if (pageModelId) {
      linkTypes.push(pageModelId)
    } else {
      console.warn(
        '[reshape-pdp-copy] model "page" not found; product_tab.content links left unrestricted'
      )
    }

    await client.fields.create(blockId, {
      label: "Content",
      api_key: "content",
      field_type: "structured_text",
      hint: "The panel's body. Embeds are the same ones a page body accepts.",
      ...(blockTypes.length > 0 && linkTypes.length > 0
        ? {
            validators: {
              structured_text_blocks: { item_types: blockTypes },
              structured_text_links: { item_types: linkTypes },
            },
          }
        : {}),
    })
  }

  return blockId
}

/**
 * Add the page fields the copy reshape and the tab system need: the ordered
 * `tabs` list, and the optional event meta line.
 */
async function addPageFields(
  client: Client,
  tabBlockId: string
): Promise<void> {
  if (!(await fieldId(client, PDP_MODEL_ID, "tabs"))) {
    await client.fields.create(PDP_MODEL_ID, {
      label: "Tabs",
      api_key: "tabs",
      field_type: "rich_text",
      hint: "The panels below the fold, in order. A page with one populated tab renders it as a plain section; two or more render as tabs.",
      validators: {
        rich_text_blocks: { item_types: [tabBlockId] },
      },
    })
    console.log("[reshape-pdp-copy] page.tabs: created")
  } else {
    console.log("[reshape-pdp-copy] page.tabs: already present")
  }

  if (!(await fieldId(client, PDP_MODEL_ID, "event_starts_at"))) {
    await client.fields.create(PDP_MODEL_ID, {
      label: "Event starts at",
      api_key: "event_starts_at",
      field_type: "date_time",
      hint: "Optional. Renders as the date on the buy box's meta line; leave blank for anything that is not a scheduled event.",
    })
  }

  if (!(await fieldId(client, PDP_MODEL_ID, "event_location"))) {
    await client.fields.create(PDP_MODEL_ID, {
      label: "Event location",
      api_key: "event_location",
      field_type: "string",
      hint: "Optional. Renders beside the date on the buy box's meta line.",
    })
  }
}

export default async function reshapeProductCopyAndAddTabs(
  client: Client
): Promise<void> {
  await renameProductDescription(client)
  await createPageShortDescription(client)
  await dropPageDescription(client)
  await dropProductShortDescription(client)

  const tabBlockId = await ensureProductTabBlock(client)
  await addPageFields(client, tabBlockId)
}
