import React from "react"
import clsx from "clsx"

import s from "./typography.module.css"

type HeadingProps = {
  variant: "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
  display: "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
  children: React.ReactNode
  className?: string
}

const Heading: React.FC<HeadingProps> = ({
  variant,
  display,
  children,
  className,
  ...props
}) => {
  const Component = variant

  return (
    <Component
      className={clsx(
        {
          [s.h1]: display === "h1",
          [s.h2]: display === "h2",
          [s.h3]: display === "h3",
          [s.h4]: display === "h4",
          [s.h5]: display === "h5",
          [s.h6]: display === "h6",
        },
        className
      )}
      {...props}
    >
      {children}
    </Component>
  )
}

export default Heading
