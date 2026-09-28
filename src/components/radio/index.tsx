"use client"

import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import clsx from "clsx"
import React from "react"

import s from "./style.module.css"

/**
 * The radio group. Radix `RadioGroup.Root`, pre-styled — compose the parts and
 * pass props; never pass classes.
 *
 * The alternative to `Select` for a short, always-visible choice: one
 * `Radio.Label` per option, each wrapping a single `Radio.Item`.
 */
const Root = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root
    ref={ref}
    className={clsx(s.root, className)}
    {...props}
  />
))
Root.displayName = "Radio.Root"

/** The dot drawn inside `Radio.Indicator` when no children are given. */
function DotIcon({ className }: { className?: string }) {
  return <span aria-hidden className={className} />
}

/** One option in the group. */
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
Item.displayName = "Radio.Item"

/**
 * The chosen marker. Defaults to a filled dot; pass children to override.
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
    {children ?? <DotIcon className={s.dot} />}
  </RadioGroupPrimitive.Indicator>
))
Indicator.displayName = "Radio.Indicator"

type LabelProps = React.ComponentPropsWithoutRef<"label">

/**
 * One option's label. Wrap the item to wire the two together automatically — a
 * generated id is injected into the wrapped `Radio.Item` and set as the label's
 * `htmlFor`:
 *
 * ```tsx
 * <Radio.Root value={value} onValueChange={setValue}>
 *   <Radio.Label>
 *     <Radio.Item value="yes">
 *       <Radio.Indicator />
 *     </Radio.Item>
 *     Yes
 *   </Radio.Label>
 * </Radio.Root>
 * ```
 *
 * Or pass an explicit `htmlFor` and keep the item elsewhere. The wrapped control
 * must be a direct child for the auto-wiring to find it.
 */
const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, htmlFor, children, ...props }, ref) => {
    const generatedId = React.useId()

    const isControl = (
      child: React.ReactNode
    ): child is React.ReactElement<{ id?: string }> =>
      React.isValidElement<{ id?: string }>(child) &&
      child.type === (Item as unknown)

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
Label.displayName = "Radio.Label"

const Radio = { Root, Item, Indicator, Label }

export default Radio
