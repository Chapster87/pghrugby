"use client"

import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import clsx from "clsx"
import React from "react"

import s from "./style.module.css"

/**
 * Carries the generated group-label id from `RadioGroup.Root` down to
 * `RadioGroup.Label`, so the group can be named without the caller managing ids.
 */
const RadioGroupLabelContext = React.createContext<string | undefined>(
  undefined
)

/**
 * The radio group. Radix `RadioGroup.Root`, pre-styled — compose the parts and
 * pass props; never pass classes.
 */
const Root = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(
  (
    {
      className,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy,
      ...props
    },
    ref
  ) => {
    const labelId = React.useId()

    return (
      <RadioGroupLabelContext.Provider value={labelId}>
        <RadioGroupPrimitive.Root
          ref={ref}
          // Name the group from the wrapped `RadioGroup.Label`; an explicit
          // label (aria-label/aria-labelledby) from the caller wins.
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy ?? (ariaLabel ? undefined : labelId)}
          className={clsx(s.root, className)}
          {...props}
        />
      </RadioGroupLabelContext.Provider>
    )
  }
)
Root.displayName = "RadioGroup.Root"

/**
 * The group's label. Must be a child of `RadioGroup.Root` — it takes the id the
 * root advertises through `aria-labelledby`:
 *
 * ```tsx
 * <RadioGroup.Root>
 *   <RadioGroup.Label>Tier</RadioGroup.Label>
 *   <RadioGroup.Item value="gold">…</RadioGroup.Item>
 * </RadioGroup.Root>
 * ```
 */
const Label = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<"span">
>(({ className, id, ...props }, ref) => {
  const labelId = React.useContext(RadioGroupLabelContext)

  return (
    <span
      ref={ref}
      id={id ?? labelId}
      className={clsx(s.label, className)}
      {...props}
    />
  )
})
Label.displayName = "RadioGroup.Label"

/**
 * A single radio option. Radix `RadioGroup.Item`, pre-styled. Put a
 * `RadioGroup.Indicator` inside it.
 */
const Item = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={clsx(s.item, className)}
    {...props}
  />
))
Item.displayName = "RadioGroup.Item"

/**
 * The selected dot. Defaults to a dot; pass children to override.
 */
const Indicator = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Indicator>
>(({ className, children, ...props }, ref) => (
  <RadioGroupPrimitive.Indicator
    ref={ref}
    className={clsx(s.indicator, className)}
    {...props}
  >
    {children ?? <span className={s.dot} aria-hidden />}
  </RadioGroupPrimitive.Indicator>
))
Indicator.displayName = "RadioGroup.Indicator"

const RadioGroup = { Root, Label, Item, Indicator }

export default RadioGroup
