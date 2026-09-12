import type { ReactNode } from "react"

import s from "./style.module.css"

type SpecimenProps = {
  /** Short label for the group, e.g. "Variants" or "States". */
  label: string
  /** The rendered control(s) under test. */
  children: ReactNode
}

/**
 * A labelled row of specimens within a section. Groups rendered controls so
 * variants and states read at a glance instead of as one undifferentiated row.
 */
export default function Specimen({ label, children }: SpecimenProps) {
  return (
    <div className={s.specimen}>
      <span className={s.label}>{label}</span>
      <div className={s.items}>{children}</div>
    </div>
  )
}
