import type { ReactNode } from "react"

/**
 * One section of the public styleguide — a design-brief element such as a
 * colour set, a logo, or a type specimen. The registry in `./index.ts` collects
 * them, so adding a section never touches the page.
 */
export type StyleGuideSection = {
  /** Anchor id, React key, and in-page nav target. */
  id: string
  /** Section heading. */
  title: string
  /** Optional one-liner describing the section. */
  description?: ReactNode
  /** Renders the section's content. */
  render: () => ReactNode
}
