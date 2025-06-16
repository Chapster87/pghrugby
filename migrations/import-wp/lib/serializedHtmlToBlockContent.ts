import { parse } from "@wordpress/block-serialization-default-parser"
import type { SanityClient, TypedObject } from "sanity"
import { JSDOM } from "jsdom"
import pLimit from "p-limit"

import { htmlToBlockContent } from "./htmlToBlockContent"
import { sanityUploadFromUrl } from "./sanityUploadFromUrl"

// Define a type for the mediaText block
type MediaTextBlock = {
  _type: "mediaText"
  image?: { asset: any; caption: string }
  text: TypedObject[]
}

export async function serializedHtmlToBlockContent(
  name: string,
  client: SanityClient,
  imageCache: Record<string, string>,
  html: string
) {
  const parsed = parse(html)

  let blocks = []
  let successCounter = 0
  let rawBlocksCounter = 0
  let unhandledBlocksCounter = 0

  const limit = pLimit(2)

  // Helper to recursively process innerBlocks
  async function processInnerBlocks(innerBlocks, client, imageCache) {
    let result: TypedObject[] = []
    if (Array.isArray(innerBlocks)) {
      for (const block of innerBlocks) {
        // Recursively process nested innerBlocks if present
        if (block.innerBlocks && block.innerBlocks.length > 0) {
          const nested = await processInnerBlocks(
            block.innerBlocks,
            client,
            imageCache
          )
          result.push({
            _type: "blockGroup",
            children: nested,
          })
        } else if (block.innerHTML) {
          const content = await htmlToBlockContent(
            block.innerHTML,
            client,
            imageCache
          )
          result.push(...content)
        }
      }
    }
    return result
  }

  for (const wpBlock of parsed) {
    switch (wpBlock.blockName) {
      case "core/heading":
      case "core/image":
      case "core/paragraph":
      case "core/separator":
      case "core/quote":
      case "core/table":
      case "core/html": {
        const block = await htmlToBlockContent(
          wpBlock.innerHTML,
          client,
          imageCache
        )
        blocks.push(...block)
        successCounter++
        break
      }
      case "core/list": {
        const listType = wpBlock.attrs?.ordered ? "number" : "bullet"
        for (const item of wpBlock.innerBlocks) {
          const itemBlocks = await htmlToBlockContent(
            item.innerHTML,
            client,
            imageCache
          )
          for (const block of itemBlocks) {
            if (block._type === "block") {
              block.listItem = listType
              block.style = "normal"
            }
          }
          blocks.push(...itemBlocks)
        }
        successCounter++
        break
      }
      case "core/list-item": {
        const listType = wpBlock.attrs?.ordered ? "number" : "bullet"
        const itemBlocks = await htmlToBlockContent(
          wpBlock.innerHTML,
          client,
          imageCache
        )
        for (const block of itemBlocks) {
          if (block._type === "block") {
            block.listItem = listType
            block.style = "normal"
          }
        }
        blocks.push(...itemBlocks)
        successCounter++
        break
      }
      case "core/columns": {
        const columnBlock = { _type: "columns", columns: [] as TypedObject[] }
        for (const column of wpBlock.innerBlocks) {
          const columnContent = []
          for (const columnBlockInner of column.innerBlocks) {
            const content = await htmlToBlockContent(
              columnBlockInner.innerHTML,
              client,
              imageCache
            )
            columnContent.push(...content)
          }
          columnBlock.columns.push({
            _type: "column",
            content: columnContent,
          })
        }
        blocks.push(columnBlock)
        successCounter++
        break
      }
      case "core/media-text": {
        const dom = new JSDOM(wpBlock.innerHTML)
        const img = dom.window.document.querySelector("figure img")
        let imageAsset

        if (img && (img as HTMLImageElement).src) {
          const asset = await limit(() =>
            sanityUploadFromUrl((img as HTMLImageElement).src, client, {})
          )
          if (asset && asset._id) {
            imageCache[(img as HTMLImageElement).src] = asset._id
            imageAsset = {
              _type: "image",
              asset: { _type: "reference", _ref: asset._id },
            }
          }
        }

        let textBlocks: TypedObject[] = []
        for (const inner of wpBlock.innerBlocks) {
          const content = await htmlToBlockContent(
            inner.innerHTML,
            client,
            imageCache
          )
          textBlocks.push(...content)
        }

        blocks.push({
          _type: "mediaText",
          image: imageAsset,
          text: textBlocks,
        })
        successCounter++
        break
      }
      case "core/button": {
        const buttonBlocks = await htmlToBlockContent(
          wpBlock.innerHTML,
          client,
          imageCache
        )
        blocks.push(...buttonBlocks)
        successCounter++
        break
      }
      case "core/buttons": {
        for (const button of wpBlock.innerBlocks) {
          const buttonBlocks = await htmlToBlockContent(
            button.innerHTML,
            client,
            imageCache
          )
          blocks.push(...buttonBlocks)
        }
        successCounter++
        break
      }
      case "core/group": {
        let groupBlocks: TypedObject[] = []
        if (
          Array.isArray(wpBlock.innerBlocks) &&
          wpBlock.innerBlocks.length > 0
        ) {
          groupBlocks = await processInnerBlocks(
            wpBlock.innerBlocks,
            client,
            imageCache
          )
        } else if (wpBlock.innerHTML) {
          const content = await htmlToBlockContent(
            wpBlock.innerHTML,
            client,
            imageCache
          )
          groupBlocks.push(...content)
        }
        blocks.push({
          _type: "blockGroup",
          children: groupBlocks,
        })
        successCounter++
        break
      }
      default: {
        if (!wpBlock.blockName) {
          if (wpBlock.innerHTML !== "\n\n") {
            console.log(`No block name: ${name}`)
            console.log(wpBlock)
            rawBlocksCounter++
          }
        } else {
          console.log(`Unhandled block type: ${wpBlock.blockName} in ${name}`)
          console.log("Inner HTML:", wpBlock.innerHTML)
          unhandledBlocksCounter++
        }
      }
    }
  }

  if (rawBlocksCounter > 0 || unhandledBlocksCounter > 0) {
    console.log(`${rawBlocksCounter} raw HTML blocks skipped`)
    console.log(`${unhandledBlocksCounter} unhandled blocks encountered`)
    console.log("Total blocks processed:", blocks.length)
  }

  return blocks
}
