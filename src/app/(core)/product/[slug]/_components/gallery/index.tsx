"use client"

import { useState } from "react"
import clsx from "clsx"
import { ChevronLeft, ChevronRight } from "lucide-react"

import type { PdpPhoto } from "../../_data/types"
import s from "./style.module.css"

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
  const mobile = photo.mobile ?? desktop
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

  return (
    <picture>
      {mobile && mobile.secure_url !== desktop.secure_url && (
        <source media="(max-width: 768px)" srcSet={mobile.secure_url} />
      )}
      <img
        className={className}
        src={desktop.secure_url}
        alt={alt}
        width={desktop.width}
        height={desktop.height}
        loading="lazy"
      />
    </picture>
  )
}
