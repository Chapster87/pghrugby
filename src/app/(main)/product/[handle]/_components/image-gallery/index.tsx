import { HttpTypes } from "@medusajs/types"
import Image from "next/image"
import s from "./styles.module.css"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
}

export default function ImageGallery({ images }: ImageGalleryProps) {
  return (
    <div className={s.productImages}>
      {images.map((image, index) => {
        return (
          <div key={image.id} className={s.imageContainer} id={image.id}>
            {!!image.url && (
              <Image
                src={image.url}
                priority={index <= 2 ? true : false}
                className="absolute inset-0 rounded-rounded"
                alt={`Product image ${index + 1}`}
                fill
                sizes="(max-width: 576px) 280px, (max-width: 768px) 360px, (max-width: 992px) 480px, 800px"
                style={{
                  objectFit: "cover",
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
