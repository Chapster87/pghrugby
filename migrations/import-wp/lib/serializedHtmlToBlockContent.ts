import type { htmlToBlocks } from "@portabletext/block-tools"
import { parse } from "@wordpress/block-serialization-default-parser"
import type { SanityClient, TypedObject } from "sanity"

import { htmlToBlockContent } from "./htmlToBlockContent"

export async function serializedHtmlToBlockContent(
  name: string,
  html: string,
  client: SanityClient,
  imageCache: Record<number, string>
) {
  // Parse content.raw HTML into WordPress blocks
  const parsed = parse(html)

  let blocks: ReturnType<typeof htmlToBlocks> = []
  let successCounter: number = 0
  let rawBlocksCounter: number = 0
  let unhandledBlocksCounter: number = 0

  for (const wpBlock of parsed) {
    // Convert inner HTML to Portable Text blocks
    if (
      wpBlock.blockName === "core/heading" ||
      wpBlock.blockName === "core/image" ||
      wpBlock.blockName === "core/list" ||
      wpBlock.blockName === "core/media-text" ||
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
    } else if (!wpBlock.blockName) {
      // console.log(`Raw HTML block skipped`)
      if (wpBlock.innerHTML.trim() !== "") {
        // console.log("content:", wpBlock.innerHTML)
        rawBlocksCounter++
      }
    } else {
      console.log(`Unhandled block type: ${wpBlock.blockName}`)
      unhandledBlocksCounter++
    }
  }

  if (rawBlocksCounter > 0 || unhandledBlocksCounter > 0) {
    console.log(`${name}: `)

    // console.log(`${successCounter} blocks processed successfully`)
    console.log(`${rawBlocksCounter} raw HTML blocks skipped`)
    console.log(`${unhandledBlocksCounter} unhandled blocks encountered`)
    console.log("Total blocks processed:", blocks.length)
  }

  return blocks
}
