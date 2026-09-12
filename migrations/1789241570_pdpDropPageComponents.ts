import { Client } from "datocms/lib/cma-client-node"

/**
 * Lossy half of the PDP restructure: destroy the `page_components` union field.
 *
 * Runs last, and only after the app query/render has switched to the new
 * buckets and been verified on the fork — the live query selects
 * `pageComponents` as a non-null list, so dropping it breaks rendering until
 * the app is updated (docs/agents/datocms-pdp-buckets-migration.md § 4).
 */

const PDP_MODEL_ID = "InXj3XuhRNSp5BIsjepR_A"
const PAGE_COMPONENTS_API_KEY = "page_components"

export default async function pdpDropPageComponents(
  client: Client
): Promise<void> {
  const fields = await client.fields.list(PDP_MODEL_ID)
  const pageComponents = fields.find(
    (field) => field.api_key === PAGE_COMPONENTS_API_KEY
  )

  if (!pageComponents) {
    console.log(
      "[pdp-drop-page-components] page_components already gone, skipped"
    )
    return
  }

  await client.fields.destroy(pageComponents.id)
  console.log("[pdp-drop-page-components] destroyed page_components")
}
