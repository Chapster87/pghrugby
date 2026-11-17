import type { ContentBlock, ContentImage, RichText } from "@/content/model"

import type { DatoAsset, DatoBlockRecord, DatoStructuredText } from "./types"

/**
 * The Cloudinary upload DatoCMS serializes into
 * `external_image_block.cloudinary`. Only the fields the site reads are named;
 * the rest of the upload is ignored.
 */
type CloudinaryUpload = {
  secure_url?: unknown
  public_id?: unknown
  width?: unknown
  height?: unknown
}

/**
 * Narrow a JSON field to a Cloudinary upload.
 *
 * `cloudinary` is a `JsonField`, so its shape is unverified at the type level.
 * The caller still checks every field it reads: a cast here would turn a
 * malformed upload into a render-time crash rather than a missing image.
 *
 * @param value - The raw JSON field.
 * @returns The upload, or null when the field is not an object.
 */
function readCloudinaryUpload(value: unknown): CloudinaryUpload | null {
  if (typeof value !== "object" || value === null) return null
  return value as CloudinaryUpload
}

/**
 * Map a Cloudinary upload to a canonical image.
 *
 * Dimensions come from the upload's own fields, never from parsing the URL. A
 * draft read carries Content-Link stega, which rewrites string fields, so a
 * regex over `secure_url` would silently stop matching in preview while looking
 * correct in production.
 *
 * @param value - The raw `cloudinary` JSON field.
 * @returns The image, or null when the upload carries no usable URL.
 */
function cloudinaryImage(value: unknown): ContentImage | null {
  const upload = readCloudinaryUpload(value)
  if (!upload) return null

  const src = typeof upload.secure_url === "string" ? upload.secure_url : null
  if (!src) return null

  return {
    src,
    // @TODO: `public_id` is a filename, not alt text. Replace with real alt text
    // once editors can supply it for external images.
    alt: typeof upload.public_id === "string" ? upload.public_id : "",
    width: typeof upload.width === "number" ? upload.width : null,
    height: typeof upload.height === "number" ? upload.height : null,
  }
}

/**
 * Map a DatoCMS upload to a canonical image.
 *
 * @param asset - The upload, or null/undefined when the field is empty.
 * @returns The image, or null when the upload carries no URL.
 */
function assetImage(asset: DatoAsset | null | undefined): ContentImage | null {
  if (!asset?.url) return null

  return {
    src: asset.url,
    alt: asset.alt ?? "",
    width: asset.width ?? null,
    height: asset.height ?? null,
  }
}

/**
 * Map one DatoCMS block record to a canonical block.
 *
 * Returns null for anything that cannot render: an empty image field, a gallery
 * with no usable images, a video with no asset, a link button missing its label
 * or href. Returning null rather than an empty block keeps the renderer from
 * emitting stray wrappers around nothing.
 *
 * @param record - The block record, discriminated by `__typename`.
 * @returns The canonical block, or null when there is nothing to render.
 */
export function toContentBlock(record: DatoBlockRecord): ContentBlock | null {
  switch (record.__typename) {
    case "ExternalImageBlockRecord": {
      // Prefer the structured upload; fall back to the bare URL with unknown
      // dimensions, which the image component renders responsively. The URL is
      // never parsed — see `cloudinaryImage`.
      const image =
        cloudinaryImage(record.cloudinary) ??
        (record.url
          ? { src: record.url, alt: "", width: null, height: null }
          : null)

      return image ? { kind: "image", id: record.id, image } : null
    }

    case "ImageBlockRecord": {
      const image = assetImage(record.asset)
      return image ? { kind: "image", id: record.id, image } : null
    }

    case "ImageGalleryBlockRecord": {
      const images = record.assets
        .map(assetImage)
        .filter((image): image is ContentImage => image !== null)

      return images.length > 0
        ? { kind: "imageGallery", id: record.id, images }
        : null
    }

    case "VideoBlockRecord": {
      const src = record.asset?.url
      return src ? { kind: "video", id: record.id, src } : null
    }

    case "LinkButtonRecord": {
      // @TODO: `link_button` has no `label` or `href` in the DatoCMS model yet.
      // The block is allowed by the homepage and membership content unions but
      // cannot render until those fields exist; this returns null until then.
      if (!record.label || !record.href) return null

      return {
        kind: "linkButton",
        id: record.id,
        label: record.label,
        href: record.href,
        variant: record.variant ?? null,
        size: record.size ?? null,
        openInNewTab: record.openInNewTab ?? false,
      }
    }

    default:
      return null
  }
}

/**
 * Map a Modular Content field to canonical blocks.
 *
 * Modular Content is the other container a block can live in: an ordered list
 * with no surrounding document, which is what makes a page-builder layout
 * possible. The blocks are the same canonical blocks a Structured Text document
 * embeds, so the components and the registry are shared — only the entry point
 * differs.
 *
 * Unrenderable blocks are dropped rather than stored as nulls, matching
 * `toRichText`, so a caller never has to filter the result.
 *
 * @param records - The field's block records, in author order, or null when the
 *   field is empty.
 * @returns The canonical blocks, in the same order.
 */
export function toContentBlocks(
  records: readonly DatoBlockRecord[] | null | undefined
): ContentBlock[] {
  if (!records?.length) return []

  return records
    .map(toContentBlock)
    .filter((block): block is ContentBlock => block !== null)
}

/**
 * Map a DatoCMS Structured Text field to canonical rich text.
 *
 * The document is passed through untouched — the renderer hands it to
 * `react-datocms`, which resolves embeds by id — while `blocks` holds the
 * canonical form of those same embeds, keyed by the same id. Unrenderable
 * embeds are dropped from `blocks` rather than stored as nulls, so a lookup
 * either finds a block or finds nothing.
 *
 * @param field - The Structured Text field, or null when the record has none.
 * @returns The canonical rich text, or null when the field carries no value.
 */
export function toRichText(
  field: DatoStructuredText | null | undefined
): RichText | null {
  if (!field?.value) return null

  const blocks: Record<string, ContentBlock> = {}

  for (const record of field.blocks) {
    const block = toContentBlock(record)
    if (block) blocks[record.id] = block
  }

  return { document: field, blocks }
}
