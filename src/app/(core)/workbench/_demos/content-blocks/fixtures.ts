import type { ContentBlock, ContentImage } from "@/content/model"

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

/** Every canonical block kind, in the order a page body would carry them. */
export const contentBlocks: ContentBlock[] = [
  {
    kind: "image",
    id: "fixture-image",
    image: crest,
  },
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
