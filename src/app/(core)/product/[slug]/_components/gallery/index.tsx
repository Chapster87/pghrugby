"use client"

import { useState } from "react"
import { getImageProps } from "next/image"
import clsx from "clsx"
import { ChevronLeft, ChevronRight } from "lucide-react"

import type { CloudinaryImage } from "@/types/datocms"
import type { PdpPhoto } from "../../_data/types"
import s from "./style.module.css"

/**
 * The gallery column's rendered width, as the optimizer's `sizes`.
 *
 * Above `lg` the page is a 4fr/1fr grid, so the gallery is roughly two fifths of
 * the viewport — until the 1536px container cap, past which it is a fixed ~577px
 * and a viewport-relative value would ask the optimizer for twice the pixels the
 * column can show. Between `md` and `lg` the page is one column and the gallery is
 * half of it; below `md` the layout has stacked and it is the full column. Each
 * tier is over-stated slightly on purpose — an over-sized candidate costs a few
 * wasted bytes, an under-sized one is visibly soft.
 */
const GALLERY_SIZES =
  "(min-width: 1537px) 577px, (min-width: 1025px) 40vw, (min-width: 769px) 50vw, 100vw"

/**
 * The page-owned gallery as a one-at-a-time carousel — the left column of the
 * chosen side-by-side PDP layout
 * (`docs/agents/pdp-layout-direction.md` § 2).
 *
 * Each item branches on the Cloudinary object's `resource_type`: an image
 * renders through a `<picture>` so the art-directed `mobile_media` crop serves
 * narrow viewports (falling back to the desktop object), a video renders as a
 * `<video>`. Nav controls are icon-only 44px targets; the dots are 30px tap
 * targets around a 10px visible dot.
 *
 * A page with no gallery items — the orphan event PDPs to date — renders a
 * neutral panel rather than an empty rail; the buy box stays readable.
 */
export default function Gallery({
  photos,
  title,
}: {
  photos: PdpPhoto[]
  title: string
}) {
  const [index, setIndex] = useState(0)

  if (photos.length === 0) {
    return <div className={clsx(s.gallery, s.galleryEmpty)} aria-hidden />
  }

  const current = Math.min(index, photos.length - 1)
  const photo = photos[current]
  const step = (delta: number) =>
    setIndex((prev) => (prev + delta + photos.length) % photos.length)

  return (
    <div className={s.gallery}>
      <GalleryMedia photo={photo} title={title} className={s.galleryMedia} />

      {photos.length > 1 && (
        <>
          <button
            type="button"
            className={clsx(s.galleryNav, s.galleryPrev)}
            onClick={() => step(-1)}
            aria-label="Previous photo"
          >
            <ChevronLeft size={24} aria-hidden />
          </button>
          <button
            type="button"
            className={clsx(s.galleryNav, s.galleryNext)}
            onClick={() => step(1)}
            aria-label="Next photo"
          >
            <ChevronRight size={24} aria-hidden />
          </button>
          <div className={s.dots}>
            {photos.map((item, i) => (
              <button
                key={item.id}
                type="button"
                className={clsx(s.dot, i === current && s.dotActive)}
                onClick={() => setIndex(i)}
                aria-label={`Photo ${i + 1} of ${photos.length}`}
                aria-current={i === current}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * One gallery item's media, branching video vs image and serving the mobile
 * crop where one exists.
 *
 * The image half is built with `getImageProps` rather than as a bare `<img>`, so
 * the art-directed `<picture>` keeps the image optimizer behind **both** halves:
 * a plain `<img>` inside a `<picture>` drops the generated `srcset`, which would
 * send every screen the full-size Cloudinary original. The desktop object is the
 * `<img>` — the half every browser can render, and the one the `<source>` falls
 * back to — and an art-directed mobile crop, when there is one, is the
 * `<source>` a narrow viewport picks instead.
 *
 * The two halves carry different `sizes`: the mobile crop only ever matches
 * below `md`, where the layout has stacked and the gallery is the full column,
 * so its candidates are chosen from `100vw`.
 */
function GalleryMedia({
  photo,
  title,
  className,
}: {
  photo: PdpPhoto
  title: string
  className: string
}) {
  const desktop = photo.desktop
  if (!desktop) {
    return <div className={clsx(className, s.galleryEmpty)} aria-hidden />
  }

  const alt = photo.alt || title

  if (desktop.resource_type === "video") {
    return (
      <video
        className={className}
        src={desktop.secure_url}
        controls
        playsInline
        preload="metadata"
        aria-label={alt}
      />
    )
  }

  const mobile = photo.mobile ?? desktop

  // The optimizer requires both dimensions and throws without them, which would
  // take the whole page down. A Cloudinary object that carries neither — or a
  // zero — is served as-is instead, the same degradation `CloudinaryImageRenderer`
  // documents: Cloudinary already delivers its own optimized variants, so only
  // the responsive `srcset` is lost.
  if (!isSized(desktop)) {
    return (
      <picture>
        {mobile.secure_url !== desktop.secure_url && (
          <source media="(max-width: 768px)" srcSet={mobile.secure_url} />
        )}
        <img
          className={className}
          src={desktop.secure_url}
          alt={alt}
          loading="lazy"
        />
      </picture>
    )
  }

  const { props: desktopProps } = getImageProps({
    src: desktop.secure_url,
    alt,
    width: desktop.width,
    height: desktop.height,
    sizes: GALLERY_SIZES,
    loading: "lazy",
    className,
  })
  const mobileSource = toMobileSource(desktop, mobile, alt)

  return (
    <picture>
      {mobileSource && (
        <source
          media="(max-width: 768px)"
          srcSet={mobileSource.srcSet}
          sizes={mobileSource.sizes}
        />
      )}
      {/* `alt` is set here as well as inside `desktopProps`, which is what the
          a11y lint rule reads. */}
      <img {...desktopProps} alt={alt} />
    </picture>
  )
}

/** Whether the optimizer can size this object; a 0 or absent dimension cannot. */
function isSized(image: CloudinaryImage): boolean {
  return image.width > 0 && image.height > 0
}

/**
 * The art-directed `<source>` for an item's mobile crop, or null when there is
 * none distinct from the desktop object.
 *
 * A crop the optimizer cannot size still earns its place — it is the right
 * picture for a phone — so it degrades to the bare Cloudinary URL rather than
 * sending the desktop object to narrow screens.
 */
function toMobileSource(
  desktop: CloudinaryImage,
  mobile: CloudinaryImage,
  alt: string
) {
  if (mobile.secure_url === desktop.secure_url) return null

  if (!isSized(mobile)) return { srcSet: mobile.secure_url, sizes: undefined }

  const { props } = getImageProps({
    src: mobile.secure_url,
    alt,
    width: mobile.width,
    height: mobile.height,
    sizes: "100vw",
  })

  return { srcSet: props.srcSet, sizes: props.sizes }
}
