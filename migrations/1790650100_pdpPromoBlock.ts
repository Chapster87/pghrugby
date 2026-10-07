import { Client } from "datocms/lib/cma-client-node"

/**
 * The per-PDP promo block (ticket #121, piece 2).
 *
 * Adds one optional **Structured Text** field, `promo`, to `product_detail_page`,
 * placed directly below the page tagline. The PDP renders it in a darker block
 * between the tagline and the option selector.
 *
 * Why a single authored field, not a list of blocks: the worked example is one
 * short offer statement ("2nd team $25 off"), and the field's stated secondary
 * use — early-bird messaging later — is the same shape, not several. A single
 * field is the smallest thing that carries that messaging; it can grow into a
 * block list when a page genuinely needs more than one offer, which no page does
 * yet.
 *
 * It is **static content**: nothing here is derived from a sale, a coupon or any
 * live pricing. A sale Price advertises itself through struck-through pricing
 * independently; this field is for the words a price cannot say.
 *
 * Additive and idempotent: the field is created only when absent, below the
 * tagline's current position.
 *
 * Authoring only — forking, running and promoting are human gates
 * (`docs/agents/datocms-pdp-buckets-migration.md` § 4). The project has a single
 * environment, `main`, so the run is `--in-place --allow-primary`.
 */

const PROMO_API_KEY = "promo"

/** An item type id by api_key, or a loud failure — never a 404 part-way through. */
async function requireItemType(
  client: Client,
  apiKey: string
): Promise<string> {
  const itemTypes = await client.itemTypes.list()
  const id = itemTypes.find((itemType) => itemType.api_key === apiKey)?.id
  if (!id) {
    throw new Error(
      `[pdp-promo-block] model "${apiKey}" not found in this environment`
    )
  }
  return id
}

export default async function pdpPromoBlock(client: Client): Promise<void> {
  const pdpModelId = await requireItemType(client, "product_detail_page")

  const fields = await client.fields.list(pdpModelId)
  if (fields.some((field) => field.api_key === PROMO_API_KEY)) {
    console.log(`[pdp-promo-block] page.${PROMO_API_KEY}: already present`)
    return
  }

  const tagline = fields.find((field) => field.api_key === "short_description")
  if (!tagline) {
    throw new Error(
      "[pdp-promo-block] anchor field \"short_description\" not found — refusing to place the promo block without it"
    )
  }

  const linkablePageId = await requireItemType(client, "page")

  await client.fields.create(pdpModelId, {
    label: "Promo block",
    api_key: PROMO_API_KEY,
    field_type: "structured_text",
    hint: "An offer or notice shown in a darker block under the tagline. Links and emphasis only; nothing here is derived from a sale.",
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
    position: tagline.position + 1,
  })

  console.log(`[pdp-promo-block] page.${PROMO_API_KEY}: created below short_description`)
}
