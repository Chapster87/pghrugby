"use client"

import Button from "@components/button"
import Dialog from "@components/dialog"

import s from "./style.module.css"

/**
 * The Dialog wrapper: trigger, overlay, panel, title/description, and both close
 * affordances (the default corner icon and a footer button via `asChild`).
 */
export default function DialogSpecimens() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button>Open dialog</Button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content>
          <Dialog.Title>Confirm your order</Dialog.Title>
          <Dialog.Description>
            Review the details before continuing to checkout.
          </Dialog.Description>

          <div className={s.actions}>
            <Dialog.Close asChild>
              <Button variant="secondary">Cancel</Button>
            </Dialog.Close>
            <Button>Confirm</Button>
          </div>

          <Dialog.Close />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
