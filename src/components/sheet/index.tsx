"use client"

import clsx from "clsx"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

import Dialog from "@components/dialog"

import s from "./style.module.css"

/**
 * The global Sheet / Drawer — an edge-anchored surface for content too tall for
 * a centred dialog. It wraps `@components/dialog` (one Radix Dialog, one focus
 * scope, one dismiss contract) and only re-anchors the panel: desktop is a
 * right-hand drawer at `min(420px, 100vw)`; mobile is a bottom sheet capped at
 * `88vh` with rounded top corners.
 *
 * The slide is plain CSS on Radix's `data-state` — no animation library — and
 * `prefers-reduced-motion` disables it. Put the visible heading in the body and
 * pass `title` for the accessibility tree only; every sheet needs one, so it is
 * required rather than optional.
 */

export default function Sheet({
  open,
  onOpenChange,
  title,
  children,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The panel's accessible name; rendered for assistive tech only. */
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal>
      <Dialog.Portal>
        <Dialog.Overlay className={s.overlay} />
        <Dialog.Content
          className={clsx(s.sheet, className)}
          aria-describedby={undefined}
        >
          <VisuallyHidden asChild>
            <Dialog.Title>{title}</Dialog.Title>
          </VisuallyHidden>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
