import { Client } from "datocms/lib/cma-client-node"

/**
 * Add the inline-image fields to both image block types.
 *
 * `image_block` (a DatoCMS asset) and `external_image_block` (a Cloudinary
 * upload) both map to one canonical `inlineImage` block, so they carry the same
 * authoring surface: a caption, an alignment, a width, an optional link and an
 * alt override. Every field is optional and every default matches the renderer's
 * fallback, so existing blocks keep rendering as they do today.
 *
 * Purely additive and idempotent: each step looks for its field before creating
 * it, and nothing is renamed or destroyed.
 */

/** The two block models the canonical inline image maps from. */
const IMAGE_BLOCK_API_KEYS = ["image_block", "external_image_block"] as const

/** A model id by api_key, or null when the project has no such model. */
async function itemTypeId(
  client: Client,
  apiKey: string
): Promise<string | null> {
  const itemTypes = await client.itemTypes.list()
  return itemTypes.find((itemType) => itemType.api_key === apiKey)?.id ?? null
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
    console.log(`[inline-image] ${field.api_key}: already present`)
    return
  }

  await client.fields.create(modelId, field)
  console.log(`[inline-image] ${field.api_key}: created`)
}

export default async function inlineImageFields(client: Client): Promise<void> {
  for (const apiKey of IMAGE_BLOCK_API_KEYS) {
    const modelId = await itemTypeId(client, apiKey)
    if (!modelId) {
      throw new Error(
        `[inline-image] model "${apiKey}" not found in this environment`
      )
    }

    await ensureField(client, modelId, {
      label: "Caption",
      api_key: "caption",
      field_type: "string",
      hint: "Optional caption shown under the image.",
    })

    await ensureField(client, modelId, {
      label: "Alignment",
      api_key: "alignment",
      field_type: "string",
      hint: "How the image sits in the prose. Left and right float at desktop; center is a block.",
      validators: { enum: { values: ["left", "center", "right"] } },
      appearance: {
        addons: [],
        editor: "string_select",
        parameters: {
          options: [
            { label: "Left", value: "left" },
            { label: "Center", value: "center" },
            { label: "Right", value: "right" },
          ],
        },
      },
      default_value: "center",
    })

    await ensureField(client, modelId, {
      label: "Width",
      api_key: "width",
      field_type: "string",
      hint: "Normal is the prose measure; wide is the card's inner width; full is edge-to-edge.",
      validators: { enum: { values: ["normal", "wide", "full"] } },
      appearance: {
        addons: [],
        editor: "string_select",
        parameters: {
          options: [
            { label: "Normal", value: "normal" },
            { label: "Wide", value: "wide" },
            { label: "Full", value: "full" },
          ],
        },
      },
      default_value: "normal",
    })

    await ensureField(client, modelId, {
      label: "Link URL",
      api_key: "link_url",
      field_type: "string",
      hint: "Optional link target when the image is clicked.",
    })

    await ensureField(client, modelId, {
      label: "Open in new tab",
      api_key: "open_in_new_tab",
      field_type: "boolean",
      hint: "Open the image link in a new tab.",
      default_value: false,
    })

    await ensureField(client, modelId, {
      label: "Alt text",
      api_key: "alt",
      field_type: "string",
      hint: "Optional alt text override; falls back to the asset's alt.",
    })
  }
}
