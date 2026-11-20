import { describe, expect, it } from "vitest"

import {
  toContentBlock,
  toContentBlocks,
  toMetaImageUrl,
  toRichText,
} from "./adapter"
import type { DatoAsset, DatoBlockRecord } from "./types"

/**
 * A DatoCMS upload fixture. Overrides let each spec state only the field it is
 * exercising, so a spec reads as the difference that matters.
 */
function asset(overrides: Partial<DatoAsset> = {}): DatoAsset {
  return {
    id: "asset-1",
    url: "https://example.test/image.jpg",
    alt: "A rugby ball",
    width: 800,
    height: 600,
    ...overrides,
  }
}

describe("toContentBlock — external image", () => {
  it("maps a Cloudinary upload to an image with its dimensions", () => {
    const block = toContentBlock({
      __typename: "ExternalImageBlockRecord",
      id: "block-1",
      cloudinary: {
        secure_url: "https://res.cloudinary.com/demo/image/upload/crest.png",
        public_id: "Crest/Crest",
        width: 300,
        height: 300,
      },
    })

    expect(block).toEqual({
      kind: "inlineImage",
      id: "block-1",
      image: {
        src: "https://res.cloudinary.com/demo/image/upload/crest.png",
        alt: "Crest/Crest",
        width: 300,
        height: 300,
      },
      caption: null,
      alignment: "center",
      width: "normal",
      link: null,
    })
  })

  it("falls back to the bare URL with unknown dimensions when the upload is absent", () => {
    const block = toContentBlock({
      __typename: "ExternalImageBlockRecord",
      id: "block-1",
      url: "https://res.cloudinary.com/demo/image/upload/crest.png",
    })

    expect(block).toEqual({
      kind: "inlineImage",
      id: "block-1",
      image: {
        src: "https://res.cloudinary.com/demo/image/upload/crest.png",
        alt: "",
        width: null,
        height: null,
      },
      caption: null,
      alignment: "center",
      width: "normal",
      link: null,
    })
  })

  it("does not parse dimensions out of the URL", () => {
    // A draft read carries Content-Link stega, which rewrites string fields, so
    // a regex over the URL would stop matching in preview only. Dimensions must
    // come from the upload's own fields or not at all.
    const block = toContentBlock({
      __typename: "ExternalImageBlockRecord",
      id: "block-1",
      url: "https://res.cloudinary.com/demo/image/upload/w_300,h_300,c_scale/crest.png",
    })

    expect(block).toMatchObject({
      image: { width: null, height: null },
    })
  })

  it("returns null when neither the upload nor the URL is present", () => {
    expect(
      toContentBlock({
        __typename: "ExternalImageBlockRecord",
        id: "block-1",
      })
    ).toBeNull()
  })

  it("returns null when the upload has no secure_url and there is no URL", () => {
    expect(
      toContentBlock({
        __typename: "ExternalImageBlockRecord",
        id: "block-1",
        cloudinary: { public_id: "Crest/Crest" },
      })
    ).toBeNull()
  })

  it("returns null when the upload is not an object", () => {
    expect(
      toContentBlock({
        __typename: "ExternalImageBlockRecord",
        id: "block-1",
        cloudinary: "not-an-upload",
      })
    ).toBeNull()
  })
})

describe("toContentBlock — image", () => {
  it("maps an asset to an image", () => {
    expect(
      toContentBlock({
        __typename: "ImageBlockRecord",
        id: "block-2",
        asset: asset(),
      })
    ).toEqual({
      kind: "inlineImage",
      id: "block-2",
      image: {
        src: "https://example.test/image.jpg",
        alt: "A rugby ball",
        width: 800,
        height: 600,
      },
      caption: null,
      alignment: "center",
      width: "normal",
      link: null,
    })
  })

  it("defaults a missing alt to an empty string", () => {
    const block = toContentBlock({
      __typename: "ImageBlockRecord",
      id: "block-2",
      asset: asset({ alt: null }),
    })

    expect(block).toMatchObject({ image: { alt: "" } })
  })

  it("returns null when the asset is missing", () => {
    expect(
      toContentBlock({ __typename: "ImageBlockRecord", id: "block-2" })
    ).toBeNull()
  })

  it("returns null when the asset carries no URL", () => {
    expect(
      toContentBlock({
        __typename: "ImageBlockRecord",
        id: "block-2",
        asset: asset({ url: "" }),
      })
    ).toBeNull()
  })
})

describe("toContentBlock — inline image fields", () => {
  it("maps the caption, alignment, width and link", () => {
    const block = toContentBlock({
      __typename: "ImageBlockRecord",
      id: "block-2",
      asset: asset(),
      caption: "A caption",
      alignment: "left",
      width: "wide",
      linkUrl: "/membership",
      openInNewTab: true,
    })

    expect(block).toMatchObject({
      caption: "A caption",
      alignment: "left",
      width: "wide",
      link: { href: "/membership", openInNewTab: true },
    })
  })

  it("defaults an unknown alignment and width", () => {
    const block = toContentBlock({
      __typename: "ImageBlockRecord",
      id: "block-2",
      asset: asset(),
      alignment: "diagonal",
      width: "enormous",
    })

    expect(block).toMatchObject({ alignment: "center", width: "normal" })
  })

  it("defaults openInNewTab to false when a link is present", () => {
    const block = toContentBlock({
      __typename: "ImageBlockRecord",
      id: "block-2",
      asset: asset(),
      linkUrl: "/membership",
    })

    expect(block).toMatchObject({
      link: { href: "/membership", openInNewTab: false },
    })
  })

  it("prefers the alt override over the asset's alt", () => {
    const block = toContentBlock({
      __typename: "ImageBlockRecord",
      id: "block-2",
      asset: asset({ alt: "Asset alt" }),
      alt: "Override alt",
    })

    expect(block).toMatchObject({ image: { alt: "Override alt" } })
  })

  it("prefers the alt override over a Cloudinary public_id", () => {
    const block = toContentBlock({
      __typename: "ExternalImageBlockRecord",
      id: "block-1",
      cloudinary: {
        secure_url: "https://res.cloudinary.com/demo/image/upload/crest.png",
        public_id: "Crest/Crest",
      },
      alt: "Override alt",
    })

    expect(block).toMatchObject({ image: { alt: "Override alt" } })
  })

  it("ignores stega in the alignment, width and link fields", () => {
    // A draft read rewrites every string, including enums and URLs. An
    // alignment compared raw to "left" would silently fall back to the default.
    const block = toContentBlock({
      __typename: "ImageBlockRecord",
      id: "block-2",
      asset: asset(),
      alignment: "left\u200B\u200C",
      width: "wide\u200B",
      linkUrl: "/membership\u200B",
    })

    expect(block).toMatchObject({
      alignment: "left",
      width: "wide",
      link: { href: "/membership", openInNewTab: false },
    })
  })

  it("leaves stega in the caption untouched", () => {
    // Captions are editorial text: the stega is what makes click-to-edit work.
    const caption = "A caption\u200B"
    const block = toContentBlock({
      __typename: "ImageBlockRecord",
      id: "block-2",
      asset: asset(),
      caption,
    })

    expect(block).toMatchObject({ caption })
  })
})

describe("toContentBlock — gallery", () => {
  it("maps every asset", () => {
    const block = toContentBlock({
      __typename: "ImageGalleryBlockRecord",
      id: "block-3",
      assets: [
        asset({ id: "a", url: "https://example.test/a.jpg" }),
        asset({ id: "b", url: "https://example.test/b.jpg" }),
      ],
    })

    expect(block).toMatchObject({
      kind: "imageGallery",
      images: [
        { src: "https://example.test/a.jpg" },
        { src: "https://example.test/b.jpg" },
      ],
    })
  })

  it("drops assets with no URL", () => {
    const block = toContentBlock({
      __typename: "ImageGalleryBlockRecord",
      id: "block-3",
      assets: [
        asset({ id: "a", url: "https://example.test/a.jpg" }),
        asset({ id: "b", url: "" }),
      ],
    })

    expect(block).toMatchObject({
      images: [{ src: "https://example.test/a.jpg" }],
    })
  })

  it("returns null when there are no usable images", () => {
    expect(
      toContentBlock({
        __typename: "ImageGalleryBlockRecord",
        id: "block-3",
        assets: [],
      })
    ).toBeNull()
  })
})

describe("toContentBlock — video", () => {
  it("maps the asset URL", () => {
    expect(
      toContentBlock({
        __typename: "VideoBlockRecord",
        id: "block-4",
        asset: asset({ url: "https://example.test/clip.mp4" }),
      })
    ).toEqual({
      kind: "video",
      id: "block-4",
      src: "https://example.test/clip.mp4",
    })
  })

  it("returns null when there is no asset", () => {
    expect(
      toContentBlock({ __typename: "VideoBlockRecord", id: "block-4" })
    ).toBeNull()
  })
})

describe("toContentBlock — link button", () => {
  it("returns null while label and href are absent", () => {
    expect(
      toContentBlock({
        __typename: "LinkButtonRecord",
        id: "block-5",
        variant: "primary",
        size: "large",
        openInNewTab: true,
      })
    ).toBeNull()
  })

  it("returns null when only one of label and href is present", () => {
    expect(
      toContentBlock({
        __typename: "LinkButtonRecord",
        id: "block-5",
        label: "Join",
      })
    ).toBeNull()

    expect(
      toContentBlock({
        __typename: "LinkButtonRecord",
        id: "block-5",
        href: "/membership",
      })
    ).toBeNull()
  })

  it("maps label, href and presentation props once both exist", () => {
    expect(
      toContentBlock({
        __typename: "LinkButtonRecord",
        id: "block-5",
        label: "Join",
        href: "/membership",
        variant: "primary",
        size: "large",
        openInNewTab: true,
      })
    ).toEqual({
      kind: "linkButton",
      id: "block-5",
      label: "Join",
      href: "/membership",
      variant: "primary",
      size: "large",
      openInNewTab: true,
    })
  })

  it("defaults openInNewTab to false and the presentation props to null", () => {
    const block = toContentBlock({
      __typename: "LinkButtonRecord",
      id: "block-5",
      label: "Join",
      href: "/membership",
    })

    expect(block).toMatchObject({
      variant: null,
      size: null,
      openInNewTab: false,
    })
  })
})

describe("toContentBlocks", () => {
  it("returns an empty list for a missing or empty field", () => {
    expect(toContentBlocks(null)).toEqual([])
    expect(toContentBlocks(undefined)).toEqual([])
    expect(toContentBlocks([])).toEqual([])
  })

  it("maps every block in author order", () => {
    const blocks = toContentBlocks([
      {
        __typename: "VideoBlockRecord",
        id: "clip",
        asset: asset({ url: "https://example.test/clip.mp4" }),
      },
      { __typename: "ImageBlockRecord", id: "still", asset: asset() },
    ])

    expect(blocks.map((block) => block.id)).toEqual(["clip", "still"])
  })

  it("drops unrenderable blocks rather than storing nulls", () => {
    const blocks = toContentBlocks([
      { __typename: "ImageBlockRecord", id: "empty" },
      { __typename: "ImageBlockRecord", id: "still", asset: asset() },
    ])

    expect(blocks.map((block) => block.id)).toEqual(["still"])
  })
})

describe("toRichText", () => {
  it("returns null for a missing field", () => {
    expect(toRichText(null)).toBeNull()
    expect(toRichText(undefined)).toBeNull()
  })

  it("returns null when the field carries no value", () => {
    expect(toRichText({ value: null, blocks: [] })).toBeNull()
  })

  it("keys blocks by their source id", () => {
    const richText = toRichText({
      value: { schema: "dast" },
      blocks: [
        {
          __typename: "ImageBlockRecord",
          id: "block-2",
          asset: asset(),
        },
      ],
    })

    expect(richText?.blocks["block-2"]).toMatchObject({ kind: "inlineImage" })
  })

  it("drops unrenderable blocks rather than storing nulls", () => {
    const richText = toRichText({
      value: { schema: "dast" },
      blocks: [
        { __typename: "ImageBlockRecord", id: "empty" },
        {
          __typename: "VideoBlockRecord",
          id: "clip",
          asset: asset({ url: "https://example.test/clip.mp4" }),
        },
      ],
    })

    expect(Object.keys(richText?.blocks ?? {})).toEqual(["clip"])
  })

  it("passes the document through untouched", () => {
    const field = { value: { schema: "dast" }, blocks: [] }

    expect(toRichText(field)?.document).toBe(field)
  })
})

describe("toContentBlock — columns", () => {
  const document = { value: { schema: "dast" }, blocks: [] }

  it("maps both columns and keeps a null slot for an empty one", () => {
    const block = toContentBlock({
      __typename: "ColumnsBlockRecord",
      id: "block-6",
      split: "60/40",
      gap: "large",
      columnOne: document,
    })

    if (block?.kind !== "columns") throw new Error("expected a columns block")

    expect(block).toMatchObject({ split: "60/40", gap: "large" })
    expect(block.columns).toHaveLength(2)
    expect(block.columns[0]).not.toBeNull()
    expect(block.columns[1]).toBeNull()
  })

  it("keeps the document untouched so the renderer can resolve its embeds", () => {
    const block = toContentBlock({
      __typename: "ColumnsBlockRecord",
      id: "block-6",
      columnOne: document,
    })

    if (block?.kind !== "columns") throw new Error("expected a columns block")

    expect(block.columns[0]?.document).toBe(document)
  })

  it("defaults a missing split, gap and alignment", () => {
    expect(
      toContentBlock({ __typename: "ColumnsBlockRecord", id: "block-6" })
    ).toMatchObject({ split: "50/50", gap: "medium", alignment: "top" })
  })

  it("maps the vertical alignment, stripping stega first", () => {
    expect(
      toContentBlock({
        __typename: "ColumnsBlockRecord",
        id: "block-6",
        alignment: "\u200Bmiddle\u200B",
      })
    ).toMatchObject({ alignment: "middle" })

    expect(
      toContentBlock({
        __typename: "ColumnsBlockRecord",
        id: "block-6",
        alignment: "bottom",
      })
    ).toMatchObject({ alignment: "bottom" })
  })

  it("strips stega from split and gap before narrowing", () => {
    // A draft read rewrites every string; a raw comparison would miss the stega
    // and silently fall back to the default ratio.
    expect(
      toContentBlock({
        __typename: "ColumnsBlockRecord",
        id: "block-6",
        split: "\u200B40/60\u200B",
        gap: "\u200Bsmall\u200B",
      })
    ).toMatchObject({ split: "40/60", gap: "small" })
  })

  it("carries the section id, stripped of stega", () => {
    // The id lands in the DOM and is what an anchor points at, so a draft read's
    // invisible characters must not survive.
    expect(
      toContentBlock({
        __typename: "ColumnsBlockRecord",
        id: "block-6",
        sectionId: "\u200Bscholarships\u200B",
      })
    ).toMatchObject({ sectionId: "scholarships" })
  })

  it("has no section id when the field is absent or blank", () => {
    expect(
      toContentBlock({ __typename: "ColumnsBlockRecord", id: "block-6" })
    ).toMatchObject({ sectionId: null })

    expect(
      toContentBlock({
        __typename: "ColumnsBlockRecord",
        id: "block-6",
        sectionId: "   ",
      })
    ).toMatchObject({ sectionId: null })
  })

  it("falls back to the defaults for values the renderer does not know", () => {
    expect(
      toContentBlock({
        __typename: "ColumnsBlockRecord",
        id: "block-6",
        split: "33/67",
        gap: "huge",
        alignment: "sideways",
      })
    ).toMatchObject({ split: "50/50", gap: "medium", alignment: "top" })
  })
})

describe("toContentBlock — unknown record", () => {
  it("returns null for a block type the adapter does not know", () => {
    // The registry and the adapter must both tolerate a type arriving before a
    // renderer exists — that is the whole point of the unknown-block rule.
    const unknown = {
      __typename: "SomeFutureBlockRecord",
      id: "block-9",
    } as unknown as DatoBlockRecord

    expect(toContentBlock(unknown)).toBeNull()
  })
})

describe("toMetaImageUrl", () => {
  it("reads the first image's URL", () => {
    expect(
      toMetaImageUrl([
        { url: "https://example.test/meta.jpg" },
        { url: "https://example.test/second.jpg" },
      ])
    ).toBe("https://example.test/meta.jpg")
  })

  it("returns null for an empty or malformed field", () => {
    expect(toMetaImageUrl(null)).toBeNull()
    expect(toMetaImageUrl(undefined)).toBeNull()
    expect(toMetaImageUrl([])).toBeNull()
    expect(toMetaImageUrl("not-an-array")).toBeNull()
    expect(toMetaImageUrl([{}])).toBeNull()
    expect(toMetaImageUrl([{ url: 42 }])).toBeNull()
  })
})
