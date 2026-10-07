import { Client } from "datocms/lib/cma-client-node"

/**
 * The sale window's display flags (ticket #121).
 *
 * Adds two booleans to the `product` model, each sitting directly below the sale
 * date picker it governs:
 *
 * - `show_sale_starts_at` — "Show price start", below `sale_starts_at`.
 * - `show_sale_ends_at` — "Show price end", below `sale_ends_at`.
 *
 * Both default **false**, so nothing changes for existing records until the owner
 * ticks them. When ticked, the PDP prints the corresponding date beside the line
 * ("Sale starts …" / "Sale ends …"), which lets the owner advertise a window that
 * has not opened yet — a sale Price is invisible until its window starts, so the
 * start date is exactly what a "coming soon" message needs.
 *
 * Additive and idempotent: each flag is created only when absent, and its
 * `position` is read fresh from the anchor field so the "below" placement holds
 * even if the sale pickers have moved since this migration was written.
 *
 * Authoring only — forking, running and promoting are human gates
 * (`docs/agents/datocms-pdp-buckets-migration.md` § 4). The project has a single
 * environment, `main`, so the run is `--in-place --allow-primary`.
 */

/** A model id by api_key, or a loud failure — never a 404 part-way through a run. */
async function requireItemType(
  client: Client,
  apiKey: string
): Promise<string> {
  const itemTypes = await client.itemTypes.list()
  const id = itemTypes.find((itemType) => itemType.api_key === apiKey)?.id
  if (!id) {
    throw new Error(
      `[sale-display-flags] model "${apiKey}" not found in this environment`
    )
  }
  return id
}

/** One display flag and the sale date field it must sit below. */
type FlagConfig = {
  apiKey: string
  label: string
  hint: string
  afterApiKey: string
}

const FLAGS: FlagConfig[] = [
  {
    apiKey: "show_sale_starts_at",
    label: "Show price start",
    hint: "Print the sale start date on the PDP. Off by default.",
    afterApiKey: "sale_starts_at",
  },
  {
    apiKey: "show_sale_ends_at",
    label: "Show price end",
    hint: "Print the sale end date on the PDP. Off by default.",
    afterApiKey: "sale_ends_at",
  },
]

async function createFlag(
  client: Client,
  modelId: string,
  flag: FlagConfig
): Promise<void> {
  // Read fresh for each flag: creating one shifts the positions below it, so the
  // anchor's `position` must not be cached across the two.
  const fields = await client.fields.list(modelId)

  if (fields.some((field) => field.api_key === flag.apiKey)) {
    console.log(`[sale-display-flags] ${flag.apiKey}: already present`)
    return
  }

  const anchor = fields.find((field) => field.api_key === flag.afterApiKey)
  if (!anchor) {
    throw new Error(
      `[sale-display-flags] anchor field "${flag.afterApiKey}" not found — refusing to place "${flag.apiKey}" without it`
    )
  }

  await client.fields.create(modelId, {
    label: flag.label,
    api_key: flag.apiKey,
    field_type: "boolean",
    default_value: false,
    hint: flag.hint,
    position: anchor.position + 1,
  })
  console.log(
    `[sale-display-flags] ${flag.apiKey}: created below ${flag.afterApiKey}`
  )
}

export default async function saleWindowDisplayFlags(
  client: Client
): Promise<void> {
  const productModelId = await requireItemType(client, "product")
  for (const flag of FLAGS) {
    await createFlag(client, productModelId, flag)
  }
}
