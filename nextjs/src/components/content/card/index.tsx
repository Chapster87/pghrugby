import Image from "next/image"
import { sanityToNextImageProps } from "@/sanity/lib/utils"
import Badge from "@/components/badge"
import Link from "next/link"
import { urlBuilder } from "@/lib/util/url"
import s from "./styles.module.css"

type ContentCard = {
  type: string
  title: string
  slug: { current: string }
  date: string
  excerpt: string
  featuredMedia: string
}

export function ContentCard({ data }: { data: ContentCard }) {
  console.log("ContentCard data:", data)
  const { type, title, slug, excerpt, featuredMedia } = data

  const imageProps = sanityToNextImageProps(featuredMedia, {
    alt: title,
  })

  return (
    <div className={s.card} data-color-scheme="light">
      {imageProps?.src && (
        <Link href={urlBuilder(type, slug.current)} className={s.cardImageLink}>
          <Image {...imageProps} src={imageProps.src as string} />
        </Link>
      )}
      <Link href={urlBuilder(type, slug.current)} className={s.cardTitleLink}>
        <h2 className={s.cardTitle}>{title}</h2>
      </Link>
      <p className={s.cardExcerpt}>
        {excerpt}
        <Link href={urlBuilder(type, slug.current)} className={s.readMore}>
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
