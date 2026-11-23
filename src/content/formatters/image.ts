import type { ContentImage } from "@/content/model"

/** Props for `next/image` when the source knows the intrinsic size. */
export type SizedImageProps = {
  kind: "sized"
  src: string
  alt: string
  width: number
  height: number
}

/** Props for the responsive fallback when the source does not. */
export type UnsizedImageProps = {
  kind: "unsized"
  src: string
  alt: string
}

/** Props for either image rendering path. */
export type ImageProps = SizedImageProps | UnsizedImageProps

/**
 * Derive image props from a canonical image.
 *
 * Dimensions come from the structured fields the adapter mapped, never from the
 * URL: a draft read carries Content-Link stega, which rewrites string fields, so
 * parsing `src` would work in production and fail in preview. `next/image`
 * requires both dimensions, so an image without them is marked unsized and the
 * caller renders the responsive fallback.
 *
 * @param image - The canonical image.
 * @returns Sized props when both dimensions are known, unsized props otherwise.
 */
export function toImageProps(image: ContentImage): ImageProps {
  const { src, alt, width, height } = image

  return width && height
    ? { kind: "sized", src, alt, width, height }
    : { kind: "unsized", src, alt }
}
