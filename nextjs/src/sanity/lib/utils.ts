import createImageUrlBuilder from "@sanity/image-url"
import { dataset, projectId, studioUrl } from "@/sanity/lib/api"
import { getImageDimensions } from "@sanity/asset-utils"

const imageBuilder = createImageUrlBuilder({
  projectId: projectId || "",
  dataset: dataset || "",
})

export const urlForImage = (source: any) => {
  // Ensure that source image contains a valid reference
  if (!source?.asset?._ref) {
    return undefined
  }

  const imageRef = source?.asset?._ref
  const crop = source.crop

  // get the image's og dimensions
  const { width, height } = getImageDimensions(imageRef)

  if (Boolean(crop)) {
    // compute the cropped image's area
    const croppedWidth = Math.floor(width * (1 - (crop.right + crop.left)))

    const croppedHeight = Math.floor(height * (1 - (crop.top + crop.bottom)))

    // compute the cropped image's position
    const left = Math.floor(width * crop.left)
    const top = Math.floor(height * crop.top)

    // gather into a url
    return imageBuilder
      ?.image(source)
      .rect(left, top, croppedWidth, croppedHeight)
      .auto("format")
  }

  return imageBuilder?.image(source).auto("format")
}

export function parseSanityImageRef(ref: string | null | undefined): string {
  if (!ref) return ""
  const [_, id, dimension, format] = ref.split("-")
  return `https://cdn.sanity.io/images/${process.env.NEXT_PUBLIC_SANITY_PROJECT_ID}/${process.env.NEXT_PUBLIC_SANITY_DATASET}/${id}-${dimension}.${format}`
}

export function sanityToNextImageProps(
  image: any,
  options?: { width?: number; height?: number; alt?: string }
) {
  if (!image?.asset?._ref) return undefined
  const imageRef = image.asset._ref
  const { width, height } = getImageDimensions(imageRef)
  const src = urlForImage(image)?.url()
  return {
    src,
    width: options?.width || width,
    height: options?.height || height,
    alt: options?.alt || image?.alt || "",
  }
}
