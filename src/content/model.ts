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

/** How an inline image sits in the prose. */
export type InlineImageAlignment = "left" | "center" | "right"

/** How wide an inline image renders. */
export type InlineImageWidth = "normal" | "wide" | "full"

/** A link wrapped around an inline image. */
export type InlineImageLink = {
  /** Absolute or site-relative URL. */
  href: string
  /** Whether the link opens in a new tab. */
  openInNewTab: boolean
}

/**
 * A single image in the flow of a record body.
 *
 * The caption is a string field, so a draft read carries stega in it; the
 * renderer must not trim or normalize it.
 */
export type InlineImageBlock = {
  kind: "inlineImage"
  /** The source record's id, stable across renders. */
  id: string
  image: ContentImage
  /** The caption, or null when the source carries none. */
  caption: string | null
  /** How the image sits in the prose. */
  alignment: InlineImageAlignment
  /** How wide the image renders. */
  width: InlineImageWidth
  /** The link wrapped around the image, or null when it has none. */
  link: InlineImageLink | null
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

/** How a columns block divides its width between two columns. */
export type ColumnsSplit = "50/50" | "60/40" | "40/60" | "65/35" | "35/65"

/** The space between columns, in both the side-by-side and stacked layouts. */
export type ColumnsGap = "none" | "small" | "medium" | "large"

/** Where a column's content sits when the other column is taller. */
export type ColumnsAlignment = "top" | "middle" | "bottom"

/**
 * Two pieces of content placed side by side.
 *
 * `columns` is a list even though the source supplies exactly two: the shape is
 * the layout, and a third column later must not change the model. Each column is
 * a whole rich-text document, so an image with a caption and a paragraph are the
 * same kind of thing here — which is why one block covers both cases.
 *
 * A column may be null. An empty column keeps its cell, because the layout is
 * why the block exists; only a block with every column empty renders nothing.
 */
export type ColumnsBlock = {
  kind: "columns"
  id: string
  /**
   * An anchor id for the section, or null when the editor left it empty.
   *
   * Functional, not editorial: it lands in the DOM as `id`, so the adapter
   * strips stega from it. The source normalises it to a slug before it arrives.
   */
  sectionId: string | null
  /** How the available width is divided. */
  split: ColumnsSplit
  /** The gap between cells, also used when the columns stack. */
  gap: ColumnsGap
  /** Where a cell's content sits against the row's height. */
  alignment: ColumnsAlignment
  /** The columns in page order; null for an empty column. */
  columns: (RichText | null)[]
}

/** Any block embedded in a record's structured text. */
export type ContentBlock =
  | InlineImageBlock
  | ImageGalleryBlock
  | VideoBlock
  | LinkButtonBlock
  | ColumnsBlock

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
