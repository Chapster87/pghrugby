// Utility function to extract plain text from Portable Text
export function extractPlainText(portableText: any): string {
  if (!portableText) return ""
  return portableText
    .map((block: any) =>
      block._type === "block"
        ? block.children.map((child: any) => child.text).join("")
        : ""
    )
    .join(" ")
}

// Ensure the data passed to PortableText is properly typed
import { PortableTextBlock } from "@portabletext/types"
export function isPortableText(value: any): value is PortableTextBlock[] {
  return Array.isArray(value)
}
