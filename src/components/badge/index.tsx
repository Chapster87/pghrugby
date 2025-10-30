import React from "react"
import clsx from "clsx"
import s from "./styles.module.css"
import unset from "lodash-es/unset"

export type BadgeVariant = "primary" | "secondary" | "tertiary"

export interface BadgeProps {
  variant?: BadgeVariant
  text: string
  beforeText?: React.ReactNode
  afterText?: React.ReactNode
  className?: string
  absolute?: boolean
  posTop?: string | number
  posRight?: string | number
  posBottom?: string | number
  posLeft?: string | number
  [key: string]: any
}

const variantClass: Record<BadgeVariant, string> = {
  primary: s.primary,
  secondary: s.secondary,
  tertiary: s.tertiary,
}

export default function Badge({
  variant = "primary",
  text,
  beforeText,
  afterText,
  className = "",
  absolute = false,
  posTop = "auto",
  posRight = "auto",
  posBottom = "auto",
  posLeft = "auto",
  ...props
}: BadgeProps) {
  return (
    <div
      className={clsx(s.badge, variantClass[variant], className, {
        [s.absolute]: absolute,
      })}
      style={
        absolute
          ? {
              position: "absolute",
              top: posTop,
              right: posRight,
              bottom: posBottom,
              left: posLeft,
            }
          : {}
      }
      {...props}
    >
      {beforeText && <span className={s["iconBefore"]}>{beforeText}</span>}
      <span className={s.text}>{text}</span>
      {afterText && <span className={s["iconAfter"]}>{afterText}</span>}
    </div>
  )
}
