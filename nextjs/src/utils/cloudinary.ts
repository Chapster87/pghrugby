/**
 * Interface for the properties of a Cloudinary image, suitable for `next/image`.
 */
interface CloudinaryImageProps {
  url: string
  width?: number | null
  height?: number | null
  crop?: string | null
  format?: string | null
  quality?: string | null
}

interface imageObjectProps {
  url: string
  width?: number | null
  height?: number | null
  crop?: string | null
  format?: string | null
  quality?: string | null
}

// Sample Url
// https://res.cloudinary.com/dvwhsjqsl/images/w_300,h_300,c_scale/f_auto,q_auto/v1778039003/Crest/Crest.png

/**
 * Parses a Cloudinary URL to extract width and height, returning an object
 * suitable for `next/image` component props.
 * If width or height are not found in the URL, they will be `null`.
 *
 * @param url The Cloudinary hosted image URL.
 * @returns An object with src, width, and height.
 */
export function getCloudinaryImageProps(url: string): CloudinaryImageProps {
  const imageObject: imageObjectProps = {
    url,
    width: null,
    height: null,
    crop: null,
    format: null,
    quality: null,
  }

  // Regex to find w_XXX and h_XXX in the URL path, specifically within the transformation segment.
  const widthMatch = url.match(/w_(\d+)/)
  const heightMatch = url.match(/h_(\d+)/)
  const cropMatch = url.match(/c_([a-zA-Z0-9]+)/)
  const formatMatch = url.match(/f_([a-zA-Z0-9]+)/)
  const qualityMatch = url.match(/q_([a-zA-Z0-9]+)/)

  if (widthMatch && widthMatch[1]) {
    imageObject.width = parseInt(widthMatch[1], 10)
  }

  if (heightMatch && heightMatch[1]) {
    imageObject.height = parseInt(heightMatch[1], 10)
  }

  if (cropMatch && cropMatch[1]) {
    imageObject.crop = cropMatch[1]
  }

  if (formatMatch && formatMatch[1]) {
    imageObject.format = formatMatch[1]
  }

  if (qualityMatch && qualityMatch[1]) {
    imageObject.quality = qualityMatch[1]
  }

  return imageObject
}
