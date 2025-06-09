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
  // Parse content.raw HTML into WordPress blocks
  const parsed = parse(html)

  let blocks = []
  let successCounter: number = 0
  let rawBlocksCounter: number = 0
  let unhandledBlocksCounter: number = 0

  // Add concurrency limit for uploads
  const limit = pLimit(2)

  for (const wpBlock of parsed) {
    // Convert inner HTML to Portable Text blocks
    if (
      wpBlock.blockName === "core/heading" ||
      wpBlock.blockName === "core/image" ||
      wpBlock.blockName === "core/list" ||
      wpBlock.blockName === "core/paragraph" ||
      wpBlock.blockName === "core/separator" ||
      wpBlock.blockName === "core/quote" ||
      wpBlock.blockName === "core/table" ||
      wpBlock.blockName === "core/html" ||
      wpBlock.blockName === "core/button" ||
      wpBlock.blockName === "core/buttons"
    ) {
      const block = await htmlToBlockContent(
        wpBlock.innerHTML,
        client,
        imageCache
      )
      blocks.push(...block)
      // console.log(`Block type: ${wpBlock.blockName} - Completed`)
      successCounter++
    } else if (wpBlock.blockName === "core/columns") {
      const columnBlock = { _type: "columns", columns: [] as TypedObject[] }
      for (const column of wpBlock.innerBlocks) {
        const columnContent = []
        for (const columnBlock of column.innerBlocks) {
          const content = await htmlToBlockContent(
            columnBlock.innerHTML,
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
      // console.log(`Block type: ${wpBlock.blockName} - Completed`)
      successCounter++
    } else if (wpBlock.blockName === "core/media-text") {
      // Extract image URL from innerHTML (figure > img)
      const dom = new JSDOM(wpBlock.innerHTML)
      const img = dom.window.document.querySelector("figure img")
      let imageAsset

      if (img && (img as HTMLImageElement).src) {
        // Use p-limit for concurrent uploads
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

      // Convert innerBlocks (text content) to Portable Text
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
    } else if (!wpBlock.blockName) {
      // console.log(`Raw HTML block skipped`)
      // if (wpBlock.innerHTML.trim() !== "") {
      // console.log("content:", wpBlock.innerHTML)
      rawBlocksCounter++
      // }
    } else {
      // console.log(`Unhandled block type: ${wpBlock.blockName}`)
      unhandledBlocksCounter++
    }
  }

  // if (rawBlocksCounter > 0 || unhandledBlocksCounter > 0) {
  //   console.log(`${name}: `)

  //   // console.log(`${successCounter} blocks processed successfully`)
  //   console.log(`${rawBlocksCounter} raw HTML blocks skipped`)
  //   console.log(`${unhandledBlocksCounter} unhandled blocks encountered`)
  //   console.log("Total blocks processed:", blocks.length)
  // }

  return blocks
}
