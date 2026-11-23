import type {
  ContentBlock,
  ContentImage,
  InlineImageBlock,
} from "@/content/model"

/**
 * Canonical fixtures for the content-block demo.
 *
 * Plain objects: no CMS, no network, no `__typename`. If a fixture needed one to
 * render, the canonical model would have leaked its source — which is exactly
 * what this demo exists to disprove.
 */

const crest: ContentImage = {
  src: "/logo.png",
  alt: "Pittsburgh Forge Rugby Club crest",
  width: 770,
  height: 770,
}

const blast: ContentImage = {
  src: "/images/forge_blast.png",
  alt: "Forge blast artwork",
  width: 565,
  height: 385,
}

const linen: ContentImage = {
  src: "/images/low-contrast-linen.png",
  alt: "Low-contrast linen texture",
  width: 256,
  height: 256,
}

const caption = "The Forge pack sets for a scrum in the 2026 season."

/** One inline image variant, with the defaults filled in. */
function inlineImage(
  id: string,
  overrides: Partial<Omit<InlineImageBlock, "kind" | "id">> = {}
): InlineImageBlock {
  return {
    kind: "inlineImage",
    id,
    image: blast,
    caption: null,
    alignment: "center",
    width: "normal",
    link: null,
    ...overrides,
  }
}

/** Every inline-image variant the component supports, for comparison. */
export const inlineImageVariants = {
  left: inlineImage("variant-left", { alignment: "left", caption }),
  center: inlineImage("variant-center", { alignment: "center", caption }),
  right: inlineImage("variant-right", { alignment: "right", caption }),
  normal: inlineImage("variant-normal", { width: "normal" }),
  wide: inlineImage("variant-wide", { width: "wide" }),
  full: inlineImage("variant-full", { width: "full" }),
  captioned: inlineImage("variant-captioned", { caption }),
  linked: inlineImage("variant-linked", {
    caption: "A linked image opens the membership page.",
    link: { href: "/membership", openInNewTab: true },
  }),
  altOverride: inlineImage("variant-alt", {
    image: { ...crest, alt: "Override alt text" },
  }),
} satisfies Record<string, InlineImageBlock>

/** Every canonical block kind, in the order a page body would carry them. */
export const contentBlocks: ContentBlock[] = [
  inlineImage("fixture-image"),
  {
    kind: "imageGallery",
    id: "fixture-gallery",
    images: [blast, linen, crest],
  },
  {
    kind: "video",
    id: "fixture-video",
    src: "https://res.cloudinary.com/demo/video/upload/dog.mp4",
  },
  {
    kind: "linkButton",
    id: "fixture-link-button",
    label: "Join the club",
    href: "/membership",
    variant: "primary",
    size: "default",
    openInNewTab: false,
  },
]
