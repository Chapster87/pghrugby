/**
 * The DatoCMS shapes the adapter accepts.
 *
 * Hand-written rather than derived from `gql.tada`'s generated types, for two
 * reasons: the adapter can then be tested with plain object fixtures and no
 * schema, and this file becomes the single written record of which DatoCMS field
 * names the site depends on. Every one of them should appear here and nowhere
 * else outside a query.
 */

/** A DatoCMS upload, as `FileFieldFragment` selects it. */
export type DatoAsset = {
  id: string
  url: string
  alt?: string | null
  width?: number | null
  height?: number | null
  title?: string | null
}

/** The authoring fields both image block types share. */
type DatoInlineImageFields = {
  caption?: string | null
  alignment?: string | null
  width?: string | null
  linkUrl?: string | null
  openInNewTab?: boolean | null
  alt?: string | null
}

/** The `external_image_block` record. */
export type DatoExternalImageBlock = DatoInlineImageFields & {
  __typename: "ExternalImageBlockRecord"
  id: string
  /** A Cloudinary upload serialized into a JSON field. */
  cloudinary?: unknown
  /** A bare Cloudinary URL, used when `cloudinary` is absent. */
  url?: string | null
}

/** The `image_block` record. */
export type DatoImageBlock = DatoInlineImageFields & {
  __typename: "ImageBlockRecord"
  id: string
  asset?: DatoAsset | null
}

/** The `image_gallery_block` record. */
export type DatoImageGalleryBlock = {
  __typename: "ImageGalleryBlockRecord"
  id: string
  assets: readonly DatoAsset[]
}

/** The `video_block` record. */
export type DatoVideoBlock = {
  __typename: "VideoBlockRecord"
  id: string
  asset?: DatoAsset | null
}

/**
 * The `link_button` record.
 *
 * `label` and `href` are not in the DatoCMS model yet — the block carries
 * presentation props only. They are declared optional so the adapter compiles
 * and returns null today, then starts rendering without a code change once the
 * fields exist and the fragment selects them.
 *
 * `testField` is deliberately absent: it is an unused experiment, not content.
 */
export type DatoLinkButtonBlock = {
  __typename: "LinkButtonRecord"
  id: string
  label?: string | null
  href?: string | null
  variant?: string | null
  size?: string | null
  openInNewTab?: boolean | null
}

/** The `columns_block` record. */
export type DatoColumnsBlock = {
  __typename: "ColumnsBlockRecord"
  id: string
  /** A split preset key, or null when the field is empty. */
  split?: string | null
  /** A gap preset key, or null when the field is empty. */
  gap?: string | null
  /** A vertical-alignment key, or null when the field is empty. */
  alignment?: string | null
  /** The anchor id for the section, or null when the field is empty. */
  sectionId?: string | null
  /** The first column's document, or null when it was left empty. */
  columnOne?: DatoStructuredText | null
  /** The second column's document, or null when it was left empty. */
  columnTwo?: DatoStructuredText | null
}

/** Any block record a content union can carry. */
export type DatoBlockRecord =
  | DatoExternalImageBlock
  | DatoImageBlock
  | DatoImageGalleryBlock
  | DatoVideoBlock
  | DatoLinkButtonBlock
  | DatoColumnsBlock

/** A DatoCMS Structured Text field, as the queries select it. */
export type DatoStructuredText = {
  value: unknown
  blocks: readonly DatoBlockRecord[]
}
