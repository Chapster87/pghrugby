"use client"

import { useState } from "react"
import Image from "next/image"

import Crest from "@svg/Crest"

import s from "./style.module.css"

type NewsImageProps = {
  src: string
  alt: string
  width: number
  height: number
}

/**
 * A news thumbnail that falls back to the dark plate when the source fails.
 * @param props - The image source and dimensions.
 * @returns The image, or the fallback plate.
 */
export function NewsImage({ src, alt, width, height }: NewsImageProps) {
  const [failed, setFailed] = useState(false)

  if (failed)
    return (
      <div className={s.newsImageFallback}>
        <Crest className={s.newsFallbackCrest} />
      </div>
    )

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      unoptimized
      className={s.newsImage}
      onError={() => setFailed(true)}
    />
  )
}
