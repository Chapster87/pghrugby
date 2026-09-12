import type { ReactNode } from "react"

import Heading from "@components/typography/heading"
import Text from "@components/typography/text"

import s from "./style.module.css"

type SectionProps = {
  /** Anchor id, used by a page's in-page index nav. */
  id?: string
  /** Section heading — the element or component being shown. */
  title: string
  /** Optional one-liner describing what the section covers. */
  description?: ReactNode
  /** The section's content. */
  children: ReactNode
}

/**
 * Shared chrome for a showcase section. Both the public styleguide and the dev
 * workbench render sections through this so they read the same section to
 * section: a heading, an optional description, and a framed surface.
 */
export default function Section({
  id,
  title,
  description,
  children,
}: SectionProps) {
  return (
    <section id={id} className={s.section} aria-label={title}>
      <header className={s.header}>
        <Heading level="h2">{title}</Heading>
        {description && <Text className={s.description}>{description}</Text>}
      </header>
      <div className={s.surface}>{children}</div>
    </section>
  )
}
