"use client"

import * as DialogPrimitive from "@radix-ui/react-dialog"
import clsx from "clsx"
import React from "react"

import s from "./style.module.css"

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      focusable="false"
      className={className}
    >
      <path
        d="M4 4l8 8M12 4l-8 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** The dialog root. Radix `Dialog.Root` — state lives here. */
const Root = DialogPrimitive.Root

/** The element that opens the dialog. Radix `Dialog.Trigger`. */
const Trigger = DialogPrimitive.Trigger

/** The floating layer. Radix `Dialog.Portal`. */
const Portal = DialogPrimitive.Portal

/** The page scrim. Radix `Dialog.Overlay`, pre-styled. */
const Overlay = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={clsx(s.overlay, className)}
    {...props}
  />
))
Overlay.displayName = "Dialog.Overlay"

/** The dialog panel. Radix `Dialog.Content`, pre-styled. */
const Content = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Content
    ref={ref}
    className={clsx(s.content, className)}
    {...props}
  />
))
Content.displayName = "Dialog.Content"

/** The dialog heading. Radix `Dialog.Title`, pre-styled. Required for a11y. */
const Title = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={clsx(s.title, className)}
    {...props}
  />
))
Title.displayName = "Dialog.Title"

/** The dialog's supporting text. Radix `Dialog.Description`, pre-styled. */
const Description = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={clsx(s.description, className)}
    {...props}
  />
))
Description.displayName = "Dialog.Description"

/**
 * The close control. Radix `Dialog.Close`, pre-styled. Defaults to a corner
 * icon button (and supplies `aria-label="Close"`); pass children to override.
 */
const Close = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Close>
>(({ className, children, "aria-label": ariaLabel, ...props }, ref) => (
  <DialogPrimitive.Close
    ref={ref}
    aria-label={ariaLabel ?? (children ? undefined : "Close")}
    className={clsx(s.close, className)}
    {...props}
  >
    {children ?? <CloseIcon className={s.closeIcon} />}
  </DialogPrimitive.Close>
))
Close.displayName = "Dialog.Close"

const Dialog = {
  Root,
  Trigger,
  Portal,
  Overlay,
  Content,
  Title,
  Description,
  Close,
}

export default Dialog
