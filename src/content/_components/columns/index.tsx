import clsx from "clsx"

import type {
  ColumnsAlignment,
  ColumnsBlock,
  ColumnsGap,
  ColumnsSplit,
} from "@/content/model"
import RenderContent from "@/content/render-content"

import s from "./styles.module.css"

/**
 * The split presets as classes.
 *
 * The canonical values carry a slash (`60/40`), which is not a usable class
 * name, so the mapping is explicit rather than indexed off the value.
 */
const splitClass: Record<ColumnsSplit, string> = {
  "50/50": s.split5050,
  "60/40": s.split6040,
  "40/60": s.split4060,
  "65/35": s.split6535,
  "35/65": s.split3565,
}

/** The gap presets as classes; the pixel values live in the stylesheet. */
const gapClass: Record<ColumnsGap, string> = {
  none: s.gapNone,
  small: s.gapSmall,
  medium: s.gapMedium,
  large: s.gapLarge,
}

/** Where a shorter cell's content sits against the taller one. */
const alignmentClass: Record<ColumnsAlignment, string> = {
  top: s.alignTop,
  middle: s.alignMiddle,
  bottom: s.alignBottom,
}

/**
 * Two pieces of content side by side.
 *
 * Each column renders through `RenderContent`, so a column is a full body: prose
 * and any embed the CMS allows there, resolved by the same registry as a page.
 * That import closes a cycle — `registry` imports this component, this component
 * imports `render-content`, and `render-content` imports `registry` — which is
 * why both are only ever *called* at render time. A call at module scope would
 * read a partially initialized module and break the first render.
 *
 * The editor's section id becomes the grid's `id`, which is what an anchor link
 * points at. It is absent from the DOM when the editor left it empty, rather
 * than rendered as `id=""`.
 *
 * Below the mobile breakpoint the columns stack; an empty column keeps its cell
 * there too, so the layout the editor chose survives the change of axis.
 *
 * @param props.block - The canonical columns block.
 * @returns The grid of columns, or null when every column is empty.
 */
export default function ColumnsBlockView({ block }: { block: ColumnsBlock }) {
  // Every column empty is no layout at all. One empty column is a layout, and
  // collapsing it would undo the editor's split — so only the all-empty block
  // is dropped.
  if (block.columns.every((column) => column === null)) return null

  // A split only means something for a pair. The model allows a third column
  // later; until the editor offers one, an unexpected length falls back to even
  // columns rather than to a fraction that has nowhere to go.
  const split = block.columns.length === 2 ? splitClass[block.split] : undefined

  return (
    <div
      id={block.sectionId ?? undefined}
      className={clsx(
        s.columns,
        split,
        gapClass[block.gap],
        alignmentClass[block.alignment]
      )}
    >
      {block.columns.map((column, index) => (
        <div key={index} className={s.column} data-column="">
          {column && <RenderContent content={column} />}
        </div>
      ))}
    </div>
  )
}
