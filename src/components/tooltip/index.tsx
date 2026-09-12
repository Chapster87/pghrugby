"use client"

import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import clsx from "clsx"
import React from "react"

import s from "./style.module.css"

/** Wraps the app (or a subtree) to share tooltip timing. Radix `Tooltip.Provider`. */
const Provider = TooltipPrimitive.Provider

/** The tooltip root. Radix `Tooltip.Root` — state lives here. */
const Root = TooltipPrimitive.Root

/** The element that reveals the tooltip. Radix `Tooltip.Trigger`. */
const Trigger = TooltipPrimitive.Trigger

/** The floating layer. Radix `Tooltip.Portal`. */
const Portal = TooltipPrimitive.Portal

/** The tooltip bubble. Radix `Tooltip.Content`, pre-styled. */
const Content = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={clsx(s.content, className)}
    {...props}
  />
))
Content.displayName = "Tooltip.Content"

/** The bubble's arrow. Radix `Tooltip.Arrow`, pre-styled. */
const Arrow = React.forwardRef<
  SVGSVGElement,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Arrow>
>(({ className, ...props }, ref) => (
  <TooltipPrimitive.Arrow
    ref={ref}
    className={clsx(s.arrow, className)}
    {...props}
  />
))
Arrow.displayName = "Tooltip.Arrow"

const Tooltip = { Provider, Root, Trigger, Portal, Content, Arrow }

export default Tooltip
