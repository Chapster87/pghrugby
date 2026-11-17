import Image from "next/image"

import type { ImageGalleryBlock } from "@/content/model"

import s from "./styles.module.css"

/**
 * A set of images rendered together.
 *
 * The adapter drops images it cannot resolve, so a gallery that reaches here
 * always has at least one. Keys combine the source URL with the index because
 * the canonical image carries no id of its own.
 *
 * @param props.block - The canonical gallery block.
 * @returns The gallery as a grid list.
 */
export default function ImageGalleryBlockView({
  block,
}: {
  block: ImageGalleryBlock
}) {
  return (
    <ul className={s.gallery}>
      {block.images.map((image, index) => (
        <li key={`${image.src}-${index}`} className={s.galleryItem}>
          {image.width && image.height ? (
            <Image
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              className={s.image}
            />
          ) : (
            // Intentionally a raw <img>: see `../image` for why.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image.src} alt={image.alt} className={s.image} />
          )}
        </li>
      ))}
    </ul>
  )
}
