"use client"

import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import clsx from "clsx"
import React from "react"

import s from "./style.module.css"

/**
 * The check glyph drawn inside `Checkbox.Indicator` when no children are given.
 */
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      focusable="false"
      className={className}
    >
      <path
        d="M3.5 8.5l3 3 6-6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * The checkbox box. Radix `Checkbox.Root`, pre-styled — compose the parts and
 * pass props; never pass classes.
 */
const Root = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={clsx(s.root, className)}
    {...props}
  />
))
Root.displayName = "Checkbox.Root"

/**
 * The checked glyph. Defaults to a check mark; pass children to override.
 */
const Indicator = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Indicator>
>(({ className, children, ...props }, ref) => (
  <CheckboxPrimitive.Indicator
    ref={ref}
    className={clsx(s.indicator, className)}
    {...props}
  >
    {children ?? <CheckIcon className={s.check} />}
  </CheckboxPrimitive.Indicator>
))
Indicator.displayName = "Checkbox.Indicator"

type LabelProps = React.ComponentPropsWithoutRef<"label">

/**
 * The checkbox's label. Wrap the box to wire the two together automatically — a
 * generated id is injected into the wrapped `Checkbox.Root` and set as the
 * label's `htmlFor`:
 *
 * ```tsx
 * <Checkbox.Label>
 *   <Checkbox.Root>
 *     <Checkbox.Indicator />
 *   </Checkbox.Root>
 *   Add insurance
 * </Checkbox.Label>
 * ```
 *
 * Or pass an explicit `htmlFor` and keep the box elsewhere. The wrapped control
 * must be a direct child for the auto-wiring to find it.
 */
const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, htmlFor, children, ...props }, ref) => {
    const generatedId = React.useId()

    const isControl = (
      child: React.ReactNode
    ): child is React.ReactElement<{ id?: string }> =>
      React.isValidElement<{ id?: string }>(child) &&
      child.type === (Root as unknown)

    const wrapped = React.Children.toArray(children).find(isControl)
    // Point the label at the wrapped control; a generated id stands in when the
    // caller supplied neither `htmlFor` nor an id on the control.
    const controlId = htmlFor ?? wrapped?.props.id ?? generatedId

    const content = React.Children.map(children, (child) => {
      // Leave an explicit htmlFor, or an id the control already carries, alone.
      if (!isControl(child) || htmlFor || child.props.id) {
        return child
      }

      return React.cloneElement(child, { id: generatedId })
    })

    return (
      <label
        ref={ref}
        htmlFor={controlId}
        className={clsx(s.label, className)}
        {...props}
      >
        {content}
      </label>
    )
  }
)
Label.displayName = "Checkbox.Label"

const Checkbox = { Root, Indicator, Label }

export default Checkbox
