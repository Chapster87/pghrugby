"use client"

/**
 * PROTOTYPE root — throwaway.
 *
 * Question: "What should the homepage 'Latest Content' slider look like?" — in
 * particular, a cut without images.
 *
 * Four variants of the homepage slider section, switchable via `?variant=` on
 * the existing dev-only workbench route (`/workbench/card-slider-home`). The
 * data fetching, container, and section heading below mimic the homepage so the
 * slider is judged in context, not in a vacuum.
 */

import { useSearchParams } from "next/navigation"

import PrototypeSwitcher, { type VariantInfo } from "./prototype-switcher"
import { sampleItems } from "./sample-data"
import { VariantA, VariantB, VariantC, VariantD } from "./variants"
import s from "./style.module.css"

const VARIANTS: VariantInfo[] = [
  { key: "A", name: "Baseline · 5-up image cards" },
  { key: "B", name: "Image-less typographic cards" },
  { key: "C", name: "Featured lead + list" },
  { key: "D", name: "Date rail" },
]

export default function CardSliderPrototype() {
  const searchParams = useSearchParams()
  const requested = (searchParams.get("variant") ?? "A").toUpperCase()
  const current = VARIANTS.some((v) => v.key === requested) ? requested : "A"

  return (
    <div className={s.prototypeRoot}>
      <p className={s.prototypeNote}>
        UI prototype — throwaway. Switch variants with the bar at the bottom, or
        the ← / → keys.
      </p>

      <div className={s.section}>
        <div className={s.sectionHeading}>
          <h2 className={s.sectionTitle}>Latest Content</h2>
          <span className={s.sectionMeta}>Variant {current}</span>
        </div>

        {current === "A" && <VariantA items={sampleItems} />}
        {current === "B" && <VariantB items={sampleItems} />}
        {current === "C" && <VariantC items={sampleItems} />}
        {current === "D" && <VariantD items={sampleItems} />}
      </div>

      <PrototypeSwitcher variants={VARIANTS} current={current} />
    </div>
  )
}
