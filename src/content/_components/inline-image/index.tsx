import clsx from "clsx"
import Image from "next/image"
import Link from "next/link"

import { toImageProps } from "@/content/formatters/image"
import type { InlineImageBlock } from "@/content/model"

import s from "./styles.module.css"

/**
 * One image in the flow of a record body.
 *
 * The figure carries the alignment and width classes; the caption sits inside
 * the grey frame, below the image. Dimensions are optional in the canonical
 * model, because a source may not know them — a bare Cloudinary URL carries
 * none. `next/image` requires both, so an image without them falls back to a
 * plain responsive `<img>` rather than throwing.
 *
 * @param props.block - The canonical inline image block.
 * @returns The image, wrapped in a figure.
 */
export default function InlineImageBlockView({
  block,
}: {
  block: InlineImageBlock
}) {
  const image = toImageProps(block.image)
  // The width option applies to centered images only; a floated image is 50%.
  const widthClass = block.alignment === "center" ? s[block.width] : undefined

  const media =
    image.kind === "sized" ? (
      <Image
        src={image.src}
        alt={image.alt}
        width={image.width}
        height={image.height}
        className={s.image}
      />
    ) : (
      // Intentionally a raw <img>: the JSDoc above states why the rule is off.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image.src} alt={image.alt} className={s.image} />
    )

  const linked = block.link ? (
    <Link
      href={block.link.href}
      target={block.link.openInNewTab ? "_blank" : undefined}
      rel={block.link.openInNewTab ? "noopener noreferrer" : undefined}
      className={s.link}
    >
      {media}
    </Link>
  ) : (
    media
  )

  return (
    <figure className={clsx(s.figure, s[block.alignment], widthClass)}>
      {linked}
      {block.caption && (
        <figcaption className={s.caption}>{block.caption}</figcaption>
      )}
    </figure>
  )
}
