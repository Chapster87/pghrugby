import React from "react"
import clsx from "clsx"

import s from "./typography.module.css"

type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
type HeadingDisplay = "display" | HeadingLevel
type HeadingVariant = "default" | "marketing"

type HeadingProps = {
  /** The semantic element to render. */
  level: HeadingLevel
  /** The visual size. Defaults to `level`; `display` is the marketing hero size. */
  display?: HeadingDisplay
  /**
   * The type ladder. `default` is the prose ladder for documents and app UI;
   * `marketing` is the larger display ladder for marketing surfaces.
   */
  variant?: HeadingVariant
  children: React.ReactNode
  className?: string
}

const defaultClasses: Record<HeadingDisplay, string> = {
  display: s.h1,
  h1: s.h1,
  h2: s.h2,
  h3: s.h3,
  h4: s.h4,
  h5: s.h5,
  h6: s.h6,
}

const marketingClasses: Record<HeadingDisplay, string> = {
  display: s.marketingDisplay,
  h1: s.marketingH1,
  h2: s.marketingH2,
  h3: s.marketingH3,
  h4: s.marketingH4,
  h5: s.marketingH5,
  h6: s.marketingH6,
}

const Heading: React.FC<HeadingProps> = ({
  level,
  display = level,
  variant = "default",
  children,
  className,
  ...props
}) => {
  const Component = level
  const classes = variant === "marketing" ? marketingClasses : defaultClasses

  return (
    <Component className={clsx(classes[display], className)} {...props}>
      {children}
    </Component>
  )
}

export default Heading
