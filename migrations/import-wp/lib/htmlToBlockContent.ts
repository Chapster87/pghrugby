import { JSDOM } from "jsdom"
import { uuid } from "@sanity/uuid"
import pLimit from "p-limit"
import type { SanityClient } from "sanity"
import type { Post } from "@/sanity.types"
import { BASE_URL } from "../constants"
import { sanityIdToImageReference } from "./sanityIdToImageReference"
import { sanityUploadFromUrl } from "./sanityUploadFromUrl"
import { wpImageFetch } from "./wpImageFetch"

type Block = any // You can refine this type based on your schema

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
  const tag = node.tagName.toLowerCase();
  if (tag === "p" || tag.match(/^h[1-6]$/)) {
    const style = tag === "p" ? "normal" : tag;
    const children = Array.from(node.childNodes)
      .map((child) => {
        if (child.nodeType === 3) {
          return textNodeToSpan(child.textContent || "");
        } else if (child.nodeType === 1) {
          return inlineElementToSpan(child as Element);
        }
        return null;
      })
      .filter(Boolean);
    return {
      _type: "block",
      _key: uuid(),
      style,
      children,
      markDefs: [],
    };
  }
  // Handle <figure> with <img> and optional <figcaption>
  if (tag === "figure") {
    const img = node.querySelector("img");
    const figcaption = node.querySelector("figcaption");
    if (img && img.src) {
      return {
        _type: "imageWithCaption",
        _key: uuid(),
        url: img.src, // Will be replaced with asset ref after upload
        caption: figcaption ? figcaption.textContent?.trim() : undefined,
      };
    }
  }
  // Handle standalone <img> tags
  if (tag === "img" && node.getAttribute("src")) {
    return {
      _type: "imageWithCaption",
      _key: uuid(),
      url: node.getAttribute("src"), // Will be replaced with asset ref after upload
      caption: undefined,
    };
  }
  return null;
}

export async function htmlToBlockContent(
  html: string,
  client: SanityClient,
  imageCache: Record<string, string>
): Promise<Post["content"]> {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const blocks: Block[] = []

  Array.from(document.body.childNodes).forEach((node) => {
    if (node.nodeType === 1) {
      const block = elementToBlock(node as Element)
      if (block) blocks.push(block)
    }
    if (node.nodeType === 3) {
      // Top-level text node
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
        if (block._type !== "imageWithCaption" || !block.url) return block;

        // Use cache to avoid duplicate uploads
        if (imageCache[block.url]) {
          return {
            ...block,
            asset: { _type: "reference", _ref: imageCache[block.url] },
            url: undefined,
          };
        }

        // Upload image to Sanity
        const asset = await sanityUploadFromUrl(block.url, client);
        if (asset && asset._id) {
          imageCache[block.url] = asset._id;
          return {
            ...block,
            asset: { _type: "reference", _ref: asset._id },
            url: undefined,
          };
        }
        // If upload fails, keep url for debugging
        return block;
      })
    )
  );

  // Remove empty blocks
  const filtered = blocksWithSanityImages.filter((block) => {
    if (!block) return false;
    if (
      block._type === "block" &&
      (!block.children || block.children.length === 0)
    )
      return false;
    return true;
  });

  // Ensure all blocks have _key
  return filtered.map((block) =>
    block._key ? block : { ...block, _key: uuid() }
  )
}
