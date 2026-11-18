import Image from "next/image"

import { toImageProps } from "@/content/formatters/image"
import type { ImageBlock } from "@/content/model"

import s from "./styles.module.css"

/**
 * One image in the flow of a record body.
 *
 * Dimensions are optional in the canonical model, because a source may not know
 * them — a bare Cloudinary URL carries none. `next/image` requires both, so an
 * image without them falls back to a plain responsive `<img>` rather than
 * throwing. Cloudinary already serves those optimized, so the fallback costs
 * nothing.
 *
 * @param props.block - The canonical image block.
 * @returns The image, wrapped in a figure.
 */
export default function ImageBlockView({ block }: { block: ImageBlock }) {
  const image = toImageProps(block.image)

  return (
    <figure className={s.figure}>
      {image.kind === "sized" ? (
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
      )}
    </figure>
  )
}
