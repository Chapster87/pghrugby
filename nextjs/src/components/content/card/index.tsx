import Image from "next/image"
import Link from "next/link"
import { urlBuilder } from "@/lib/util/url"
import s from "./styles.module.css"

type ContentCard = {
  type: string
  title: string
  slug: string
  date: string
  excerpt: React.ReactNode
  featuredMedia: { secure_url: string; width: number; height: number } | null
}

export function ContentCard({ data }: { data: ContentCard }) {
  const { type, title, slug, excerpt, featuredMedia } = data

  const imageProps = featuredMedia
    ? {
        src: featuredMedia.secure_url || null,
        alt: title,
        width: featuredMedia.width,
        height: featuredMedia.height,
      }
    : null

  return (
    <div className={s.card} data-color-scheme="light">
      {imageProps?.src && (
        <Link href={urlBuilder(type, slug)} className={s.cardImageLink}>
          <Image {...imageProps} src={imageProps.src as string} />
        </Link>
      )}
      <Link href={urlBuilder(type, slug)} className={s.cardTitleLink}>
        <h2 className={s.cardTitle}>{title}</h2>
      </Link>
      <p className={s.cardExcerpt}>
        {excerpt}
        <Link href={urlBuilder(type, slug)} className={s.readMore}>
          Read More
        </Link>
      </p>

      {/* Hidden for now, while we are showing posts only */}
      {/* <div className={s.cardBottom}>
        <Badge variant="primary" text={type} />
      </div> */}
    </div>
  )
}
