/**
 * Builds a URL based on link type and slug.
 * @param type - The type of link (e.g., 'product', 'post', etc.)
 * @param slug - The slug for the item
 */
export function urlBuilder(type: string, slug?: string): string {
  if (type === "product" && slug) {
    return `/product/${slug}`
  }
  if (type === "post" && slug) {
    return `/post/${slug}`
  }
  if (slug) {
    return `/${slug}`
  }
  return "#"
}
