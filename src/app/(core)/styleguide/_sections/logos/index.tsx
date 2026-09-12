import Image from "next/image"

import Crest from "@svg/Crest"

import type { StyleGuideSection } from "../types"
import s from "./style.module.css"

// Raster marks shipped in /public. The crest is the inline SVG component the
// header uses, rendered first.
const imageMarks = [
  { name: "Primary logo", src: "/logo.png" },
  { name: "Forge blast", src: "/images/forge_blast.png" },
  { name: "Forge blast (drop)", src: "/images/forge_blast_drop.png" },
]

/**
 * The club's logo marks, shown on a light surface.
 */
function LogoSpecimens() {
  return (
    <ul className={s.marks}>
      <li className={s.mark}>
        <div className={s.frame}>
          <Crest className={s.crest} />
        </div>
        <span className={s.markName}>Crest</span>
      </li>
      {imageMarks.map((mark) => (
        <li key={mark.src} className={s.mark}>
          <div className={s.frame}>
            <Image
              src={mark.src}
              alt={mark.name}
              width={240}
              height={160}
              className={s.image}
            />
          </div>
          <span className={s.markName}>{mark.name}</span>
        </li>
      ))}
    </ul>
  )
}

const logosSection: StyleGuideSection = {
  id: "logos",
  title: "Logos",
  description: "The club's marks, shown on a light surface.",
  render: () => <LogoSpecimens />,
}

export default logosSection
