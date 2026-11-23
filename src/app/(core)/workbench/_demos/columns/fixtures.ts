import type {
  ColumnsBlock,
  ContentImage,
  InlineImageBlock,
  RichText,
} from "@/content/model"

/**
 * Canonical fixtures for the columns demo.
 *
 * Plain objects, like the content-block fixtures: no CMS, no network, no
 * `__typename`. The documents are shaped the way the adapter hands them to the
 * renderer — the source field, `{ value, blocks }` — so this demo exercises the
 * same path a page body does.
 */

const blast: ContentImage = {
  src: "/images/forge_blast.png",
  alt: "Forge blast artwork",
  width: 565,
  height: 385,
}

const crest: ContentImage = {
  src: "/logo.png",
  alt: "Pittsburgh Forge Rugby Club crest",
  width: 770,
  height: 770,
}

const linen: ContentImage = {
  src: "/images/low-contrast-linen.png",
  alt: "Low-contrast linen texture",
  width: 256,
  height: 256,
}

/** A one-paragraph document. */
function paragraph(text: string): RichText {
  return {
    document: {
      value: {
        schema: "dast",
        document: {
          type: "root",
          children: [
            {
              type: "paragraph",
              children: [{ type: "span", value: text }],
            },
          ],
        },
      },
      blocks: [],
    },
    blocks: {},
  }
}

/** A document holding one captioned image, keyed the way an embed resolves. */
function figure(
  id: string,
  image: ContentImage,
  caption: string,
  width: InlineImageBlock["width"] = "normal",
  alignment: InlineImageBlock["alignment"] = "center"
): RichText {
  const block: InlineImageBlock = {
    kind: "inlineImage",
    id,
    image,
    caption,
    alignment,
    width,
    link: null,
  }

  return {
    document: {
      value: {
        schema: "dast",
        document: {
          type: "root",
          // A block node points at its record through `item`; the renderer looks
          // that id up in `document.blocks` before handing the record back.
          children: [{ type: "block", item: id }],
        },
      },
      blocks: [{ id }],
    },
    blocks: { [id]: block },
  }
}

/** One columns block, with the defaults filled in. */
function columns(
  id: string,
  overrides: Partial<Omit<ColumnsBlock, "kind" | "id">> = {}
): ColumnsBlock {
  return {
    kind: "columns",
    id,
    sectionId: null,
    split: "50/50",
    gap: "medium",
    alignment: "top",
    columns: [null, null],
    ...overrides,
  }
}

/** Every columns variant the component supports, for comparison. */
export const columnVariants = {
  twoImages: columns("columns-two-images", {
    sectionId: "two-images",
    columns: [
      figure("columns-two-images-a", blast, "The Forge blast artwork."),
      figure("columns-two-images-b", crest, "The club crest."),
    ],
  }),
  imageAndText: columns("columns-image-text", {
    split: "60/40",
    columns: [
      figure("columns-image-text-a", blast, "The Forge blast artwork."),
      paragraph(
        "A paragraph beside an image. A column is a whole body: prose, headings, lists, and every embed a page accepts."
      ),
    ],
  }),
  emptySecond: columns("columns-empty-second", {
    split: "60/40",
    columns: [
      paragraph(
        "An empty neighbour keeps its cell, so the split the editor chose still holds."
      ),
      null,
    ],
  }),
  gapNone: columns("columns-gap-none", {
    gap: "none",
    columns: [
      figure("columns-gap-none-a", blast, "Gap: none."),
      figure("columns-gap-none-b", crest, "Gap: none."),
    ],
  }),
  gapSmall: columns("columns-gap-small", {
    gap: "small",
    columns: [
      figure("columns-gap-small-a", blast, "Gap: small."),
      figure("columns-gap-small-b", crest, "Gap: small."),
    ],
  }),
  gapLarge: columns("columns-gap-large", {
    gap: "large",
    columns: [
      figure("columns-gap-large-a", blast, "Gap: large."),
      figure("columns-gap-large-b", crest, "Gap: large."),
    ],
  }),
  splitWideLeft: columns("columns-split-wide-left", {
    split: "65/35",
    columns: [
      figure("columns-split-wide-left-a", blast, "65 / 35 — the wide column."),
      figure(
        "columns-split-wide-left-b",
        linen,
        "65 / 35 — the narrow column."
      ),
    ],
  }),
  splitWideRight: columns("columns-split-wide-right", {
    split: "35/65",
    columns: [
      figure(
        "columns-split-wide-right-a",
        linen,
        "35 / 65 — the narrow column."
      ),
      figure("columns-split-wide-right-b", blast, "35 / 65 — the wide column."),
    ],
  }),
  floatedImage: columns("columns-floated-image", {
    columns: [
      figure(
        "columns-floated-image-a",
        blast,
        "Authored left-aligned, rendered full width.",
        "normal",
        "left"
      ),
      paragraph(
        "A float exists to let prose wrap around the image. A column usually holds the image on its own, so there is nothing to wrap: inside a column the image takes the cell instead of reserving half of it."
      ),
    ],
  }),
  alignMiddle: columns("columns-align-middle", {
    split: "60/40",
    alignment: "middle",
    columns: [
      figure("columns-align-middle-a", blast, "Aligned to the middle."),
      paragraph(
        "A short paragraph. The image column is taller, so this one sits at the vertical centre of the row."
      ),
    ],
  }),
  alignBottom: columns("columns-align-bottom", {
    split: "60/40",
    alignment: "bottom",
    columns: [
      figure("columns-align-bottom-a", blast, "Aligned to the bottom."),
      paragraph(
        "A short paragraph, pinned to the bottom of the row while the image fills its height."
      ),
    ],
  }),
  wideImage: columns("columns-wide-image", {
    columns: [
      figure(
        "columns-wide-image-a",
        blast,
        "A `wide` image inside a column.",
        "wide"
      ),
      figure(
        "columns-wide-image-b",
        crest,
        "A `full` image inside a column.",
        "full"
      ),
    ],
  }),
} satisfies Record<string, ColumnsBlock>
