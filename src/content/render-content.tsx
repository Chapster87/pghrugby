import type { ReactElement } from "react"

import type { ContentBlock, ContentNode, RichText } from "@/content/model"

import UnknownBlock from "./_components/unknown"
import { renderBlock } from "./registry"
import RenderRichText from "./render-rich-text"

/**
 * Whether an unrenderable node should be shown rather than dropped.
 *
 * A labelled gap is a bug report at authoring time; a silent one is a gap on a
 * live page. DatoCMS preview only ever runs outside production
 * (`src/lib/cms-preview.ts`), so this one condition covers both dev and preview.
 */
const showPlaceholders = process.env.NODE_ENV !== "production"

/**
 * Render one canonical block.
 *
 * Exported so a caller that already holds a block — the workbench demo, a
 * component composing blocks directly — does not have to go through a document.
 *
 * @param props.block - The canonical block.
 * @returns The block's element.
 */
export function RenderBlock({ block }: { block: ContentBlock }) {
  return renderBlock(block)
}

/**
 * Render one node in the flow of a record body.
 *
 * Blocks dispatch through the registry. A record reference renders nothing:
 * no record renderers ship yet, because no content field currently allows a
 * record link. The seam exists so adding one stays additive.
 *
 * @param props.node - The canonical node.
 * @returns The node's element, or null when it renders nothing.
 */
export function RenderNode({ node }: { node: ContentNode }) {
  if (node.kind === "record") {
    return showPlaceholders ? (
      <UnknownBlock label={`record:${node.model}`} />
    ) : null
  }

  return renderBlock(node)
}

/**
 * Render an ordered list of blocks — a Modular Content field.
 *
 * Modular Content is the other container a block can live in: an ordered list
 * with no surrounding document, which is what makes a page-builder layout
 * possible. The blocks are the same canonical blocks a Structured Text document
 * embeds, so the components and the registry are shared; only the entry point
 * differs.
 *
 * @param props.blocks - The canonical blocks, in author order.
 * @returns The blocks rendered in sequence, or null when there are none.
 */
export function RenderBlocks({ blocks }: { blocks: readonly ContentBlock[] }) {
  if (blocks.length === 0) return null

  return (
    <>
      {blocks.map((block) => (
        <RenderBlock key={block.id} block={block} />
      ))}
    </>
  )
}

/**
 * Render a record's body.
 *
 * The entry point for a Structured Text field. It resolves each embedded block
 * through the canonical map the adapter built, so the renderer never sees a CMS
 * record and never needs to know which CMS produced the document.
 *
 * @param props.content - The canonical rich text, or null when the record has no
 *   body.
 * @returns The rendered body, or null.
 */
export default function RenderContent({
  content,
}: {
  content: RichText | null
}): ReactElement | null {
  if (!content) return null

  return (
    <RenderRichText
      document={content.document}
      renderBlock={(record) => {
        const block = content.blocks[record.id]

        if (block) return renderBlock(block)

        return showPlaceholders ? (
          <UnknownBlock label={record.__typename ?? record.id} />
        ) : null
      }}
    />
  )
}
