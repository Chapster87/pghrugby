import React from "react"
import clsx from "clsx"
import s from "./typography.module.css"

type TextProps = {
  variant?: "p" | "span" | "div"
  size?: "sm" | "default" | "lg"
  children: React.ReactNode
  className?: string
}

const Text: React.FC<TextProps> = ({
  variant = "p",
  size = "default",
  children,
  className,
  ...props
}) => {
  const Component = variant

  return (
    <Component
      className={clsx(
        {
          [s.smallText]: size === "sm",
          [s.defaultText]: size === "default",
          [s.largeText]: size === "lg",
        },
        className
      )}
      {...props}
    >
      {children}
    </Component>
  )
}

export default Text
