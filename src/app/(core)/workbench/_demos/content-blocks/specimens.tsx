import Specimen from "@components/showcase/specimen"

import UnknownBlock from "@/content/_components/unknown"
import { RenderBlocks } from "@/content/render-content"

import { contentBlocks } from "./fixtures"
import s from "./style.module.css"

/**
 * The canonical block library, rendered from hand-written fixtures.
 *
 * No CMS, no network, no `__typename`: the fixtures are plain canonical objects,
 * so this page doubles as proof that the model is source-independent. The
 * sequence goes through `RenderBlocks`, so the registry is exercised too.
 */
export default function ContentBlocksSpecimens() {
  return (
    <>
      <Specimen label="In sequence">
        <div className={s.sequence}>
          <RenderBlocks blocks={contentBlocks} />
        </div>
      </Specimen>

      <Specimen label="Unknown block">
        <UnknownBlock label="record:page" />
      </Specimen>
    </>
  )
}
