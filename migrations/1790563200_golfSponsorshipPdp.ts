import { Client, buildBlockRecord } from "datocms/lib/cma-client-node"

import { findCatalogItem } from "../src/lib/checkout/catalog"

/**
 * Golf outing sponsorship: the five tier records, their collector, and their PDP
 * (`docs/adr/0002-golf-sponsorship-is-its-own-pdp.md`, ticket #122).
 *
 * **Structural work only.** The page's tagline, the outing's event meta, and any
 * below-fold tab are authored in the CMS: they change per outing and no code reads
 * them, so committing them here would freeze copy that is the owner's to write.
 *
 * What it lands:
 *
 * 1. A `data_field.field_type` **enum**, so the field-type vocabulary is a
 *    dropdown in the CMS rather than free text. The renderer falls back to a text
 *    input for a value it does not know, so a typo is silent — and an invalid
 *    block invalidates its whole collector, which the app's reads then exclude.
 *    Landing this before the collector below is what keeps its `radio` valid.
 * 2. One `product` record per tier (`golf-sponsor-*`), `in_stock: true`,
 *    `quantity_bearing: false`, and `description` set to that tier's perks — the
 *    copy a `variation` page renders beneath the selected option.
 * 3. A `data_collector` — business name, the logo question as a `radio`, and the
 *    sponsor's contact email, all three required.
 * 4. The `product_detail_page` at slug `golf-outing-sponsorship`,
 *    `product_type: variation`, the five tiers as `primary_products` richest
 *    first, no add-ons, and the collector attached.
 *
 * **Order of operations.** The tier `price_id`s are read from `catalog.ts`, which
 * is where the live Price ids go after `pnpm provision:stripe:apply` prints its
 * price map (the approval checklist's five `golf-sponsor-*` rows). Run the apply
 * and paste the ids into `sponsorshipTiers` **before** this migration, or the
 * records land with a blank Price id and the tiers will not bill in live mode — a
 * re-run with the ids in place tops them up.
 *
 * Authoring only: forking, running and promoting are human gates, and the Stripe
 * apply is one too (`docs/agents/stripe-catalog-approval.md`). The project has a
 * single environment, `main`, so the run is `--in-place --allow-primary`.
 * Idempotent by construction: every step looks for its target before acting.
 */

/** One sponsorship tier: its sku, its CMS title, and the perks a buyer sees. */
type Tier = { sku: string; title: string; perks: string }

/** A perk list as the plain-text `description` the buy box renders. */
function bullets(lines: string[]): string {
  return lines.map((line) => `• ${line}`).join("\n")
}

/**
 * The tiers, richest first — the page's `primary_products` order. The perks are
 * the live WordPress product's per-variation copy, carried over verbatim.
 */
const TIERS: Tier[] = [
  {
    sku: "golf-sponsor-masters",
    title: "Golf Outing Sponsorship — Masters Sponsor",
    perks: bullets([
      "Event naming rights",
      "2 complimentary foursomes ($880 value)",
      "Banner signage at the clubhouse, and signage at 2 tee boxes",
      "Sponsored item provided to all golfers",
      "Website and social media press release announcing the partnership",
    ]),
  },
  {
    sku: "golf-sponsor-pro",
    title: "Golf Outing Sponsorship — Pro Sponsor",
    perks: bullets([
      "1 complimentary foursome ($440 value)",
      "Banner signage at the clubhouse, and signage at 1 tee box",
      "Sponsored item provided to all golfers",
      "Social media promotion",
    ]),
  },
  {
    sku: "golf-sponsor-hole-in-one",
    title: "Golf Outing Sponsorship — Hole-in-One Sponsor",
    perks: bullets([
      "1 complimentary twosome ($220 value)",
      "Banner signage at the clubhouse, and signage at 1 tee box",
    ]),
  },
  {
    sku: "golf-sponsor-eagle",
    title: "Golf Outing Sponsorship — Eagle Sponsor",
    perks: bullets([
      "Take over a tee box or the drinks cart for the duration of the outing",
      "Signage at 1 tee box",
    ]),
  },
  {
    sku: "golf-sponsor-birdie",
    title: "Golf Outing Sponsorship — Birdie Sponsor",
    perks: bullets(["Signage at 1 tee box"]),
  },
]

/**
 * The `field_type` vocabulary, in the order the CMS dropdown offers it.
 *
 * Every value the renderer understands belongs here, and none may be dropped while
 * a record uses it: a value outside this list makes its `data_field` block invalid,
 * which invalidates the whole `data_collector`, which the app's reads then exclude
 * (`src/lib/datocms/executeQuery.ts` defaults to `excludeInvalid`) — the
 * registration form disappears from the page rather than erroring.
 */
const FIELD_TYPES = [
  "text",
  "textarea",
  "email",
  "select",
  "radio",
  "checkbox",
] as const

/** The collector record's title. */
const COLLECTOR_TITLE = "Golf Outing Sponsorship — Business & contact"

/**
 * The sponsorship collector's fields. The logo question is a `radio` so the answer
 * is one of two values rather than free text, and its label carries the address a
 * sponsor sends the file to — the club asks for the logo by email, not by upload
 * (`docs/adr/0002-golf-sponsorship-is-its-own-pdp.md`).
 */
const COLLECTOR_FIELDS: {
  label: string
  fieldName: string
  fieldType: string
  required?: boolean
  options?: string[]
}[] = [
  {
    label: "Business name",
    fieldName: "businessName",
    fieldType: "text",
    required: true,
  },
  {
    label:
      "Will you be sending a logo? (please email to: golfouting@pghrugby.com)",
    fieldName: "logo",
    fieldType: "radio",
    required: true,
    options: ["Yes", "No"],
  },
  {
    label: "Sponsor contact email",
    fieldName: "sponsorEmail",
    fieldType: "email",
    required: true,
  },
]

/** The PDP's clean root URL slug, and the title the CMS shows for it. */
const SPONSORSHIP_SLUG = "golf-outing-sponsorship"
const PAGE_TITLE = "Golf Outing Sponsorship"

/** Resolved by api_key before any function below reads them. */
let PRODUCT_MODEL_ID = ""
let PDP_MODEL_ID = ""
let DATA_COLLECTOR_MODEL_ID = ""
let DATA_FIELD_MODEL_ID = ""

/** A model id by api_key, or a loud failure — never a 404 part-way through a run. */
async function requireItemType(
  client: Client,
  apiKey: string
): Promise<string> {
  const itemTypes = await client.itemTypes.list()
  const found = itemTypes.find((itemType) => itemType.api_key === apiKey)
  if (!found) {
    throw new Error(
      `[sponsorship] model "${apiKey}" not found in this environment`
    )
  }
  return found.id
}

/** Every product record's sku → id, so each lookup is one pass. */
async function productIdsBySku(client: Client): Promise<Map<string, string>> {
  const bySku = new Map<string, string>()
  for await (const product of client.items.listPagedIterator(
    { filter: { type: PRODUCT_MODEL_ID } },
    { perPage: 100, concurrency: 1 }
  )) {
    const sku = (product as { sku?: unknown }).sku
    if (typeof sku === "string" && sku.length > 0) bySku.set(sku, product.id)
  }
  return bySku
}

/** Whether two id arrays are the same, order included (mirrors the bucket migration). */
function sameIds(value: unknown, expected: string[]): boolean {
  if (!Array.isArray(value)) return expected.length === 0
  if (value.length !== expected.length) return false
  return value.every((id, index) => id === expected[index])
}

/**
 * Ensure one tier record exists, keyed to its catalog Price and carrying its perks.
 *
 * @param client - The CMA client for the environment being migrated.
 * @param tier - The tier to land.
 * @param bySku - The live sku → record-id map, updated in place as records are created.
 * @returns The record's id.
 */
async function ensureTier(
  client: Client,
  tier: Tier,
  bySku: Map<string, string>
): Promise<string> {
  const item = findCatalogItem(tier.sku)
  if (!item) {
    throw new Error(
      `[sponsorship] "${tier.sku}" is not in the checkout catalog — catalog.ts and this migration disagree`
    )
  }

  const priceId = item.priceId ?? null
  if (!priceId) {
    console.warn(
      `[sponsorship] ${tier.sku}: no Price id in the catalog — landing it blank. Run the Stripe apply, paste the id into sponsorshipTiers, and re-run.`
    )
  }

  const existingId = bySku.get(tier.sku)
  if (existingId) {
    const record = (await client.items.find(existingId)) as unknown as {
      price_id?: unknown
      description?: unknown
    }
    if (record.price_id === priceId && record.description === tier.perks) {
      console.log(`[sponsorship] tier ${tier.sku}: already present`)
      return existingId
    }
    await client.items.update(existingId, {
      description: tier.perks,
      price_id: priceId,
    })
    await client.items.publish(existingId)
    console.log(`[sponsorship] tier ${tier.sku}: perks and/or Price id set`)
    return existingId
  }

  const record = await client.items.create({
    item_type: { type: "item_type", id: PRODUCT_MODEL_ID },
    title: tier.title,
    sku: tier.sku,
    description: tier.perks,
    price_id: priceId,
    in_stock: true,
    quantity_bearing: false,
  })
  await client.items.publish(record.id)
  bySku.set(tier.sku, record.id)
  console.log(`[sponsorship] tier ${tier.sku}: created`)
  return record.id
}

/**
 * Constrain `data_field.field_type` to the renderer's vocabulary.
 *
 * A `string` field plus an `enum` validator is DatoCMS's dropdown, and validators —
 * unlike `field_type` itself — are updatable in place, so this is one field update
 * rather than the create → convert → drop → rename a type change would need
 * (`1790313304_addRichPageTagline.ts`). Existing validators are preserved.
 *
 * @param client - The CMA client for the environment being migrated.
 */
async function ensureFieldTypeEnum(client: Client): Promise<void> {
  const fields = await client.fields.list(DATA_FIELD_MODEL_ID)
  const field = fields.find((candidate) => candidate.api_key === "field_type")
  if (!field) {
    throw new Error(
      '[sponsorship] data_field has no "field_type" field — cannot constrain the vocabulary'
    )
  }

  const validators = (field.validators ?? {}) as unknown as Record<
    string,
    unknown
  > & { enum?: { values?: unknown } }
  const current = validators.enum?.values

  if (
    Array.isArray(current) &&
    current.length === FIELD_TYPES.length &&
    current.every((value, index) => value === FIELD_TYPES[index])
  ) {
    console.log("[sponsorship] data_field.field_type: enum already set")
    return
  }

  await client.fields.update(field.id, {
    validators: { ...validators, enum: { values: [...FIELD_TYPES] } },
  })
  console.log(
    `[sponsorship] data_field.field_type: enum set → ${FIELD_TYPES.join(", ")}`
  )
}

/**
 * Ensure the sponsorship collector exists and carries the three fields.
 *
 * Rebuilt from `COLLECTOR_FIELDS` on every run (found by title), so the field set
 * is the file's, not a hand-edit's: the shape below is the contract the buy box
 * and the flyout's edit panel both render.
 *
 * @param client - The CMA client for the environment being migrated.
 * @returns The collector record's id.
 */
async function ensureCollector(client: Client): Promise<string> {
  const blocks = COLLECTOR_FIELDS.map((field) =>
    buildBlockRecord({
      item_type: { type: "item_type", id: DATA_FIELD_MODEL_ID },
      label: field.label,
      field_name: field.fieldName,
      field_type: field.fieldType,
      required: field.required ?? false,
      // One option per line — the format `parseOptions` reads, and the only one an
      // option containing a comma survives.
      options: field.options ? field.options.join("\n") : null,
      placeholder: null,
      repeatable: false,
      max: null,
    })
  )

  const fields = { title: COLLECTOR_TITLE, form_fields: blocks }

  let existingId: string | null = null
  for await (const raw of client.items.listPagedIterator(
    { filter: { type: DATA_COLLECTOR_MODEL_ID } },
    { perPage: 100, concurrency: 1 }
  )) {
    if ((raw as { title?: unknown }).title === COLLECTOR_TITLE) {
      existingId = raw.id
    }
  }

  if (existingId) {
    await client.items.update(existingId, fields)
    await client.items.publish(existingId)
    console.log(`[sponsorship] collector "${COLLECTOR_TITLE}": updated`)
    return existingId
  }

  const record = await client.items.create({
    item_type: { type: "item_type", id: DATA_COLLECTOR_MODEL_ID },
    ...fields,
  })
  await client.items.publish(record.id)
  console.log(`[sponsorship] collector "${COLLECTOR_TITLE}": created`)
  return record.id
}

/** The page fields a re-run compares before deciding to write (§ idempotency). */
type PageSnapshot = {
  product_type?: unknown
  primary_products?: unknown
  data_collectors?: unknown
}

/**
 * Ensure the sponsorship PDP exists, pointing at the five tiers and the collector.
 *
 * The page is found by slug and updated only when the wiring actually differs, so
 * a re-run is a no-op.
 *
 * @param client - The CMA client for the environment being migrated.
 * @param primaryIds - The tier record ids, in render order.
 * @param collectorId - The collector the buy box renders.
 */
async function ensurePage(
  client: Client,
  primaryIds: string[],
  collectorId: string
): Promise<void> {
  let pageId: string | null = null
  let current: PageSnapshot | null = null

  for await (const raw of client.items.listPagedIterator(
    { filter: { type: PDP_MODEL_ID } },
    { perPage: 100, concurrency: 1 }
  )) {
    if ((raw as { slug?: unknown }).slug !== SPONSORSHIP_SLUG) continue
    pageId = raw.id
    current = raw as unknown as PageSnapshot
  }

  const fields = {
    title: PAGE_TITLE,
    slug: SPONSORSHIP_SLUG,
    product_type: "variation",
    primary_products: primaryIds,
    addon_products: [] as string[],
    data_collectors: [collectorId],
  }

  if (pageId && current) {
    const unchanged =
      current.product_type === "variation" &&
      sameIds(current.primary_products, primaryIds) &&
      sameIds(current.data_collectors, [collectorId])
    if (unchanged) {
      console.log(`[sponsorship] page "${SPONSORSHIP_SLUG}": already present`)
      return
    }
    await client.items.update(pageId, fields)
    await client.items.publish(pageId)
    console.log(`[sponsorship] page "${SPONSORSHIP_SLUG}": updated`)
    return
  }

  const record = await client.items.create({
    item_type: { type: "item_type", id: PDP_MODEL_ID },
    ...fields,
  })
  await client.items.publish(record.id)
  console.log(`[sponsorship] page "${SPONSORSHIP_SLUG}": created`)
}

export default async function golfSponsorshipPdp(
  client: Client
): Promise<void> {
  PRODUCT_MODEL_ID = await requireItemType(client, "product")
  PDP_MODEL_ID = await requireItemType(client, "product_detail_page")
  DATA_COLLECTOR_MODEL_ID = await requireItemType(client, "data_collector")
  DATA_FIELD_MODEL_ID = await requireItemType(client, "data_field")

  // Before the collector: its logo field is a `radio`, which must be inside the
  // enum or the block — and so the collector — lands invalid.
  await ensureFieldTypeEnum(client)

  const bySku = await productIdsBySku(client)

  const primaryIds: string[] = []
  for (const tier of TIERS) {
    primaryIds.push(await ensureTier(client, tier, bySku))
  }

  const collectorId = await ensureCollector(client)
  await ensurePage(client, primaryIds, collectorId)
}
