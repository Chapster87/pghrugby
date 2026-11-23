import type { VideoBlock } from "@/content/model"

import s from "./styles.module.css"

/**
 * A video file, played with the browser's own controls.
 *
 * @param props.block - The canonical video block.
 * @returns The video, wrapped in a figure.
 */
export default function VideoBlockView({ block }: { block: VideoBlock }) {
  return (
    <figure className={s.figure}>
      <video controls src={block.src} className={s.video} />
    </figure>
  )
}
