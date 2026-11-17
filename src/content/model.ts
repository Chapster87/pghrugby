/**
 * The canonical content model.
 *
 * This is the contract every content source is mapped onto: the DatoCMS adapter
 * today, ForgeCMS natively later. Nothing here may name a CMS concept — no
 * `__typename`, no `cloudinary`, no `secure_url` — because a component that
 * understood those would have to understand every source at once, which is the
 * duplication this module exists to remove.
 *
 * The shapes are deliberately smaller than DatoCMS's. Three of its block types
 * describe an image and differ only in where the URL came from; here that is one
 * `image` block, and provenance is the adapter's problem.
 */

/** One image, with whatever dimensions the source could supply. */
export type ContentImage = {
  /** Absolute URL of the image. */
  src: string
  /** Alt text; an empty string when the source carries none. */
  alt: string
  /** Intrinsic width in pixels, or null when the source does not know it. */
  width: number | null
  /** Intrinsic height in pixels, or null when the source does not know it. */
  height: number | null
}

/** A single image in the flow of a record body. */
export type ImageBlock = {
  kind: "image"
  /** The source record's id, stable across renders. */
  id: string
  image: ContentImage
}

/** A set of images rendered together. */
export type ImageGalleryBlock = {
  kind: "imageGallery"
  id: string
  images: ContentImage[]
}

/** A video file. */
export type VideoBlock = {
  kind: "video"
  id: string
  src: string
}

/**
 * A call-to-action link.
 *
 * `label` and `href` are required: a link button without either is not a link
 * button, so an adapter that cannot supply both must return null rather than an
 * empty button.
 */
export type LinkButtonBlock = {
  kind: "linkButton"
  id: string
  label: string
  href: string
  variant: string | null
  size: string | null
  openInNewTab: boolean
}

/** Any block embedded in a record's structured text. */
export type ContentBlock =
  | ImageBlock
  | ImageGalleryBlock
  | VideoBlock
  | LinkButtonBlock

/** The discriminant every block carries. */
export type ContentBlockKind = ContentBlock["kind"]

/**
 * A reference to a record embedded in structured text.
 *
 * A record exists independently of the content that mentions it, so this carries
 * a reference rather than the record's fields and the renderer resolves it. No
 * record renderers ship yet — no content field currently allows a record link —
 * but the seam exists so adding one stays additive.
 */
export type ContentRecordRef = {
  kind: "record"
  /** The source model's key, e.g. `page` or `article`. */
  model: string
  id: string
}

/** Anything that can appear in the flow of a record's body. */
export type ContentNode = ContentBlock | ContentRecordRef

/**
 * A rich-text document, kept opaque.
 *
 * `document` is the source CMS's own structured-text value, passed through
 * untouched: normalizing a full rich-text AST buys little, and it is the part
 * least likely to differ between sources. `blocks` is the canonical form of the
 * document's embeds, keyed by source id, so the renderer can resolve an embed
 * without mapping it a second time.
 */
export type RichText = {
  document: unknown
  blocks: Readonly<Record<string, ContentBlock>>
}
