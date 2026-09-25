"use client"

import * as TabsPrimitive from "@radix-ui/react-tabs"
import clsx from "clsx"
import React from "react"

import s from "./style.module.css"

/**
 * The tabs wrapper — a global, pre-styled layer over Radix `Tabs`, in the same
 * shape as `@components/select`: a namespace of primitives rather than one
 * configurable component, so the caller keeps control of labels, ordering and
 * which tab is active.
 *
 * Whether a tab strip is warranted at all is the caller's rule, not this
 * component's. The PDP renders a single populated panel as a plain section with
 * its heading and reaches for this only at two or more
 * (`docs/pdp-to-minicart-to-checkout-spec.md` § 5.6).
 */

/** The tabs root. Radix `Tabs.Root` — the active value lives here. */
const Root = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Root
    ref={ref}
    className={clsx(s.root, className)}
    {...props}
  />
))
Root.displayName = "Tabs.Root"

/** The tab strip. Radix `Tabs.List`, pre-styled. Put the triggers inside it. */
const List = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={clsx(s.list, className)}
    {...props}
  />
))
List.displayName = "Tabs.List"

/**
 * One tab's control. Radix `Tabs.Trigger`, pre-styled. Its `value` pairs it with
 * the `Content` carrying the same `value`.
 */
const Trigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={clsx(s.trigger, className)}
    {...props}
  />
))
Trigger.displayName = "Tabs.Trigger"

/** One tab's panel. Radix `Tabs.Content`, pre-styled. */
const Content = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={clsx(s.content, className)}
    {...props}
  />
))
Content.displayName = "Tabs.Content"

const Tabs = { Root, List, Trigger, Content }

export default Tabs
