import Specimen from "@components/showcase/specimen"

import UnknownBlock from "@/content/_components/unknown"
import { RenderBlock, RenderBlocks } from "@/content/render-content"

import { contentBlocks, inlineImageVariants } from "./fixtures"
import s from "./style.module.css"

/**
 * The canonical block library, rendered from hand-written fixtures.
 *
 * No CMS, no network, no `__typename`: the fixtures are plain canonical objects,
 * so this page doubles as proof that the model is source-independent. The
 * sequence goes through `RenderBlocks`, so the registry is exercised too.
 *
 * The image variants sit inside a `.prose` block rather than a `Specimen` row:
 * `wide` and `full` size against the prose measure, and a flex row would give
 * them the wrong containing block.
 */
export default function ContentBlocksSpecimens() {
  return (
    <>
      <Specimen label="In sequence">
        <div className={s.sequence}>
          <RenderBlocks blocks={contentBlocks} />
        </div>
      </Specimen>

      <div className={s.group}>
        <h3 className={s.groupTitle}>Alignment</h3>
        <div className={`prose ${s.variants}`}>
          <div className={s.variant}>
            <RenderBlock block={inlineImageVariants.left} />
            <p>
              Left-aligned image with text wrapping around it. The float applies
              at desktop widths and collapses to a block below the mobile
              breakpoint.
            </p>
          </div>
          <div className={s.variant}>
            <RenderBlock block={inlineImageVariants.center} />
            <p>Centered image, the default alignment.</p>
          </div>
          <div className={s.variant}>
            <RenderBlock block={inlineImageVariants.right} />
            <p>
              Right-aligned image with text wrapping around it. The caption
              travels with the image.
            </p>
          </div>
        </div>
      </div>

      <div className={s.group}>
        <h3 className={s.groupTitle}>Width</h3>
        <div className={`prose ${s.variants}`}>
          <div className={s.variant}>
            <RenderBlock block={inlineImageVariants.normal} />
          </div>
          <div className={s.variant}>
            <RenderBlock block={inlineImageVariants.wide} />
          </div>
          <div className={s.variant}>
            <RenderBlock block={inlineImageVariants.full} />
          </div>
        </div>
      </div>

      <div className={s.group}>
        <h3 className={s.groupTitle}>Caption and link</h3>
        <div className={`prose ${s.variants}`}>
          <div className={s.variant}>
            <RenderBlock block={inlineImageVariants.captioned} />
          </div>
          <div className={s.variant}>
            <RenderBlock block={inlineImageVariants.linked} />
          </div>
          <div className={s.variant}>
            <RenderBlock block={inlineImageVariants.altOverride} />
          </div>
        </div>
      </div>

      <Specimen label="Unknown block">
        <UnknownBlock label="record:page" />
      </Specimen>
    </>
  )
}
