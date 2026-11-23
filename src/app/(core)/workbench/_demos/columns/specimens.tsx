import { RenderBlock } from "@/content/render-content"

import { columnVariants } from "./fixtures"
import s from "./style.module.css"

/**
 * The columns block, rendered from hand-written fixtures.
 *
 * Each group is a canonical block, so the demo needs no CMS and no network. The
 * columns render through the shared component, which means this page also proves
 * that a column is a whole body: the captioned images and the paragraphs are
 * resolved by the same registry a page uses.
 */
const groups = [
  {
    title: "Two images",
    note: 'The motivating case: two captioned images side by side at 50 / 50. This block carries a section id, so its grid renders with id="two-images" and can be linked to as #two-images.',
    block: columnVariants.twoImages,
  },
  {
    title: "Image and text",
    note: "60 / 40, an image beside a paragraph. No second block type is involved.",
    block: columnVariants.imageAndText,
  },
  {
    title: "Empty second column",
    note: "An empty column keeps its cell on purpose — the split is the layout, not a consequence of what was written. The block only disappears when every column is empty.",
    block: columnVariants.emptySecond,
  },
  {
    title: "Alignment inside a column",
    note: "The image is authored left-aligned. A float only makes sense with prose beside it, so in a column the image fills the cell and the column's split is what sets its width.",
    block: columnVariants.floatedImage,
  },
  {
    title: "Vertical alignment: middle",
    note: "The shorter column sits at the vertical centre of the row. One setting per block, not per column.",
    block: columnVariants.alignMiddle,
  },
  {
    title: "Vertical alignment: bottom",
    note: "The same pair pinned to the bottom.",
    block: columnVariants.alignBottom,
  },
  {
    title: "Split: 65 / 35",
    note: "The wide column takes the larger share at desktop; both stack below the mobile breakpoint.",
    block: columnVariants.splitWideLeft,
  },
  {
    title: "Split: 35 / 65",
    note: "The same pair with the ratio reversed, authored by putting the wide content in the second column.",
    block: columnVariants.splitWideRight,
  },
  {
    title: "Gap: none",
    note: "The gap is a per-block choice, applied between columns and between them when stacked.",
    block: columnVariants.gapNone,
  },
  {
    title: "Gap: small",
    note: "16px.",
    block: columnVariants.gapSmall,
  },
  {
    title: "Gap: large",
    note: "40px.",
    block: columnVariants.gapLarge,
  },
  {
    title: "Wide and full images",
    note: "`wide` and `full` are written against the content card, so inside a column they clamp to the cell instead of breaking out under the neighbour.",
    block: columnVariants.wideImage,
  },
]

/** The demo's specimens, in the order the groups read. */
export default function ColumnsSpecimens() {
  return (
    <>
      {groups.map((group) => (
        <div key={group.block.id} className={s.group}>
          <h3 className={s.groupTitle}>{group.title}</h3>
          <p className={s.note}>{group.note}</p>
          <div className={s.stage}>
            <RenderBlock block={group.block} />
          </div>
        </div>
      ))}
    </>
  )
}
