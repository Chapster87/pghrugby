// Extracts the first text from the first block in a Sanity content array
export default function generateExcerpt(content: any[]): string {
  if (!Array.isArray(content)) return ""
  const firstBlock = content.find(
    (item) => item._type === "block" && Array.isArray(item.children)
  )
  if (!firstBlock) return ""
  const firstTextChild = firstBlock.children.find(
    (child: any) => child._type === "span" && typeof child.text === "string"
  )
  return firstTextChild ? firstTextChild.text : ""
}
