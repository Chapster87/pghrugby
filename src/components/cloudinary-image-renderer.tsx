import Image from "next/image"

type Props = {
  src: string
  alt: string
  width?: number | null
  height?: number | null
}

/**
 * Render a Cloudinary image from CMS content. When explicit dimensions are
 * unknown (a raw Cloudinary URL without a transformation segment, or a 0
 * value), fall back to a plain, responsive <img> so next/image's required
 * width/height props never crash the page. Cloudinary already serves these
 * images optimized, so skipping next/image for the fallback is fine.
 */
export default function CloudinaryImageRenderer({
  src,
  alt,
  width,
  height,
}: Props) {
  if (width && height) {
    return <Image src={src} alt={alt} width={width} height={height} />
  }
  // Intentionally a raw <img>; the JSDoc above states why the rule is off here.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} style={{ maxWidth: "100%", height: "auto" }} />
  )
}
