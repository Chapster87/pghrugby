"use client"

import * as SwitchPrimitive from "@radix-ui/react-switch"
import clsx from "clsx"
import React from "react"

import s from "./style.module.css"

/**
 * The switch track. Radix `Switch.Root`, pre-styled — compose the parts and
 * pass props; never pass classes.
 */
const Root = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={clsx(s.root, className)}
    {...props}
  />
))
Root.displayName = "Switch.Root"

/**
 * The switch knob. Radix `Switch.Thumb`, pre-styled.
 */
const Thumb = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Thumb>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Thumb
    ref={ref}
    className={clsx(s.thumb, className)}
    {...props}
  />
))
Thumb.displayName = "Switch.Thumb"

type LabelProps = React.ComponentPropsWithoutRef<"label">

/**
 * The switch's label. Wrap the track to wire the two together automatically — a
 * generated id is injected into the wrapped `Switch.Root` and set as the
 * label's `htmlFor`:
 *
 * ```tsx
 * <Switch.Label>
 *   <Switch.Root>
 *     <Switch.Thumb />
 *   </Switch.Root>
 *   Recurring
 * </Switch.Label>
 * ```
 *
 * Or pass an explicit `htmlFor` and keep the track elsewhere. The wrapped
 * control must be a direct child for the auto-wiring to find it.
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
Label.displayName = "Switch.Label"

const Switch = { Root, Thumb, Label }

export default Switch
