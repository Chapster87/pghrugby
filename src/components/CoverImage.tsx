import Image from "next/image"

type CoverImageProps = {
  image: any // Replace 'any' with your Sanity image type if available
  alt?: string
  priority?: boolean
  className?: string
}

export default function CoverImage({ image, alt = "", priority = false, className = "" }: CoverImageProps) {
  if (!image || !image.asset) {
    return null
  }

  // If you have a Sanity image URL builder, use it here
  // For now, fallback to asset.url
  const imageUrl = image.asset.url

  return (
    <div className={className}>
      <Image
        src={imageUrl}
        alt={alt || image.alt || ""}
        width={image.asset.metadata?.dimensions?.width || 1200}
        height={image.asset.metadata?.dimensions?.height || 630}
        priority={priority}
        className="rounded-lg w-full h-auto"
      />
    </div>
  )
}