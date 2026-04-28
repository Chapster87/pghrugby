import { JSDOM } from "jsdom"
import { v4 as uuid } from "uuid"
import pLimit from "p-limit"

// You may want to refine this type based on your schema
type Block = any

function textNodeToSpan(text: string) {
  return {
    _type: "span",
    _key: uuid(),
    text,
    marks: [],
  }
}

function inlineElementToSpan(node: Element): Block | null {
  const tag = node.tagName.toLowerCase()
  if (tag === "strong" || tag === "b") {
    return {
      ...textNodeToSpan(node.textContent || ""),
      marks: ["strong"],
    }
  }
  if (tag === "em" || tag === "i") {
    return {
      ...textNodeToSpan(node.textContent || ""),
      marks: ["em"],
    }
  }
  if (tag === "a") {
    return {
      ...textNodeToSpan(node.textContent || ""),
      marks: ["link"],
    }
  }
  // Fallback: treat as plain text
  return textNodeToSpan(node.textContent || "")
}

function elementToBlock(node: Element): Block | null {
  const tag = node.tagName.toLowerCase()

  switch (tag) {
    case "div":
      if (node.classList.contains("wp-block-group")) {
        // Block Group
        const groupChildren = Array.from(node.childNodes)
          .map((child) => {
            if (child.nodeType === 1) return elementToBlock(child as Element)
            if (child.nodeType === 3) {
              const text = child.textContent?.trim()
              if (text) {
                return {
                  _type: "block",
                  _key: uuid(),
                  style: "normal",
                  children: [textNodeToSpan(text)],
                  markDefs: [],
                }
              }
            }
            return null
          })
          .filter(Boolean)
        return groupChildren.length
          ? {
              _type: "blockGroup",
              _key: uuid(),
              children: groupChildren,
            }
          : null
      }
      if (node.classList.contains("wp-block-button")) {
        // Single Button Wrapper
        const link = node.querySelector("a.wp-block-button__link")
        if (link) return elementToBlock(link)
      }
      if (node.classList.contains("wp-block-buttons")) {
        // Button Group
        const buttons = Array.from(node.children)
          .map((child) => {
            if (
              child.nodeType === 1 &&
              (child as Element).classList.contains("wp-block-button")
            ) {
              return elementToBlock(child as Element)
            }
            return null
          })
          .filter(Boolean)
        return buttons.length
          ? {
              _type: "buttonGroup",
              _key: uuid(),
              buttons,
            }
          : null
      }
      break

    case "p":
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6": {
      const style = tag === "p" ? "normal" : tag
      const children = Array.from(node.childNodes)
        .map((child) => {
          if (child.nodeType === 3) {
            return textNodeToSpan(child.textContent || "")
          } else if (child.nodeType === 1) {
            return inlineElementToSpan(child as Element)
          }
          return null
        })
        .filter(Boolean)
      return {
        _type: "block",
        _key: uuid(),
        style,
        children,
        markDefs: [],
      }
    }

    case "figure": {
      const img = node.querySelector("img")
      const figcaption = node.querySelector("figcaption")
      if (img && img.src) {
        return {
          _type: "imageWithCaption",
          _key: uuid(),
          url: img.src, // Will be replaced with asset ref after upload
          caption: figcaption ? figcaption.textContent?.trim() : undefined,
          alt: img.getAttribute("alt") || undefined, // <-- added to preserve alt tag
        }
      }
      break
    }

    case "img":
      if (node.getAttribute("src")) {
        return {
          _type: "image",
          _key: uuid(),
          url: node.getAttribute("src"),
          caption: undefined,
          alt: node.getAttribute("alt") || undefined, // <-- added to preserve alt tag
        }
      }
      break

    case "li": {
      const children = Array.from(node.childNodes)
        .map((child) => {
          if (child.nodeType === 3) {
            return textNodeToSpan(child.textContent || "")
          } else if (child.nodeType === 1) {
            return inlineElementToSpan(child as Element)
          }
          return null
        })
        .filter(Boolean)
      return {
        _type: "block",
        _key: uuid(),
        style: "normal",
        children,
        markDefs: [],
      }
    }

    case "a":
      if (
        node.classList.contains("wp-block-button__link") ||
        node.parentElement?.classList.contains("wp-block-button")
      ) {
        return {
          _type: "button",
          _key: uuid(),
          text: node.textContent?.trim() || "",
          url: node.getAttribute("href") || "",
          style: node.getAttribute("class") || "",
          target: node.getAttribute("target") || "",
          rel: node.getAttribute("rel") || "",
        }
      }
      break

    default:
      break
  }

  return null
}

export async function htmlToBlockContent(
  html: string,
  client: any,
  imageCache: Record<string, string>
): Promise<Block[]> {
  const dom = new JSDOM(html)
  const document = dom.window.document
  const blocks: Block[] = []

  Array.from(document.body.childNodes).forEach((node) => {
    if (node.nodeType === 1) {
      const block = elementToBlock(node as Element)
      if (block) {
        if (Array.isArray(block)) {
          blocks.push(...block)
        } else {
          blocks.push(block)
        }
      }
    } else if (node.nodeType === 3) {
      const text = node.textContent?.trim()
      if (text) {
        blocks.push({
          _type: "block",
          _key: uuid(),
          style: "normal",
          children: [textNodeToSpan(text)],
          markDefs: [],
        })
      }
    }
  })

  // Use pLimit for concurrency control on image uploads
  const limit = pLimit(2)

  const blocksWithSanityImages = await Promise.all(
    blocks.map((block) =>
      limit(async () => {
        // Here you could handle image uploads and replace URLs with asset refs if needed
        // For now, just return the block as-is
        return block
      })
    )
  )

  // Remove empty blocks
  const filtered = blocksWithSanityImages.filter((block) => block)

  // Ensure all blocks have _key
  return filtered.map((block) =>
    block._key ? block : { ...block, _key: uuid() }
  )
}
