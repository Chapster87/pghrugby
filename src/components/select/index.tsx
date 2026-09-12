"use client"

import * as SelectPrimitive from "@radix-ui/react-select"
import clsx from "clsx"
import React from "react"

import s from "./style.module.css"

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      focusable="false"
      className={className}
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      focusable="false"
      className={className}
    >
      <path
        d="M4 10l4-4 4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

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

/** The select root. Radix `Select.Root` — state lives here. */
const Root = SelectPrimitive.Root

/** The floating layer. Radix `Select.Portal`. */
const Portal = SelectPrimitive.Portal

/**
 * The trigger button. Radix `Select.Trigger`, pre-styled. Put a `Select.Value`
 * and `Select.Icon` inside it.
 */
const Trigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={clsx(s.trigger, className)}
    {...props}
  />
))
Trigger.displayName = "Select.Trigger"

/** The selected value (or placeholder). Radix `Select.Value`, pre-styled. */
const Value = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Value>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Value
    ref={ref}
    className={clsx(s.value, className)}
    {...props}
  />
))
Value.displayName = "Select.Value"

/** The trigger chevron. Defaults to a down chevron; pass children to override. */
const Icon = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Icon>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Icon
    ref={ref}
    className={clsx(s.icon, className)}
    {...props}
  >
    {children ?? <ChevronDownIcon className={s.glyph} />}
  </SelectPrimitive.Icon>
))
Icon.displayName = "Select.Icon"

/**
 * The dropdown panel. Radix `Select.Content`, pre-styled. Defaults to
 * `position="popper"`; put a `Select.Viewport` inside it.
 */
const Content = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, position = "popper", sideOffset = 4, ...props }, ref) => (
  <SelectPrimitive.Content
    ref={ref}
    position={position}
    sideOffset={sideOffset}
    className={clsx(s.content, className)}
    {...props}
  />
))
Content.displayName = "Select.Content"

/** The scrollable list area. Radix `Select.Viewport`, pre-styled. */
const Viewport = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Viewport
    ref={ref}
    className={clsx(s.viewport, className)}
    {...props}
  />
))
Viewport.displayName = "Select.Viewport"

/** A labelled set of options. Radix `Select.Group`, pre-styled. */
const Group = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Group>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Group
    ref={ref}
    className={clsx(s.group, className)}
    {...props}
  />
))
Group.displayName = "Select.Group"

/** A group heading. Radix `Select.Label`, pre-styled. */
const Label = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={clsx(s.label, className)}
    {...props}
  />
))
Label.displayName = "Select.Label"

/** One option. Radix `Select.Item`, pre-styled. */
const Item = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={clsx(s.item, className)}
    {...props}
  />
))
Item.displayName = "Select.Item"

/** An option's text. Radix `Select.ItemText`, pre-styled. */
const ItemText = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ItemText>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ItemText
    ref={ref}
    className={clsx(s.itemText, className)}
    {...props}
  />
))
ItemText.displayName = "Select.ItemText"

/** The selected marker. Defaults to a check; pass children to override. */
const ItemIndicator = React.forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ItemIndicator>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.ItemIndicator
    ref={ref}
    className={clsx(s.itemIndicator, className)}
    {...props}
  >
    {children ?? <CheckIcon className={s.glyph} />}
  </SelectPrimitive.ItemIndicator>
))
ItemIndicator.displayName = "Select.ItemIndicator"

/** A divider between options. Radix `Select.Separator`, pre-styled. */
const Separator = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={clsx(s.separator, className)}
    {...props}
  />
))
Separator.displayName = "Select.Separator"

/** Scrolls the list up. Defaults to an up chevron; pass children to override. */
const ScrollUpButton = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={clsx(s.scrollButton, className)}
    {...props}
  >
    {children ?? <ChevronUpIcon className={s.glyph} />}
  </SelectPrimitive.ScrollUpButton>
))
ScrollUpButton.displayName = "Select.ScrollUpButton"

/** Scrolls the list down. Defaults to a down chevron; pass children to override. */
const ScrollDownButton = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={clsx(s.scrollButton, className)}
    {...props}
  >
    {children ?? <ChevronDownIcon className={s.glyph} />}
  </SelectPrimitive.ScrollDownButton>
))
ScrollDownButton.displayName = "Select.ScrollDownButton"

/** The panel arrow. Radix `Select.Arrow`, pre-styled. */
const Arrow = React.forwardRef<
  SVGSVGElement,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Arrow>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Arrow
    ref={ref}
    className={clsx(s.arrow, className)}
    {...props}
  />
))
Arrow.displayName = "Select.Arrow"

const Select = {
  Root,
  Trigger,
  Value,
  Icon,
  Portal,
  Content,
  Viewport,
  Group,
  Label,
  Item,
  ItemText,
  ItemIndicator,
  Separator,
  ScrollUpButton,
  ScrollDownButton,
  Arrow,
}

export default Select
