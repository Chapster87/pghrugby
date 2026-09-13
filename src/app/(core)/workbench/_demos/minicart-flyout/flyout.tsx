"use client"

import { useEffect, useRef, useState } from "react"
import clsx from "clsx"
import * as Dialog from "@radix-ui/react-dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

import CartPanel from "./cart-panel"
import type { PricedLine } from "./data"
import EditPanel from "./edit-panel"
import type { CartModel } from "./store"
import s from "./style.module.css"

/**
 * PROTOTYPE (chosen) — the minicart flyout shell, retained as the implementation
 * reference from wayfinder ticket #63. One Radix Dialog whose content swaps
 * between the cart list and the registration edit panel (`view: cart | edit`,
 * per `docs/agents/registration-editing.md` § 5). No second Dialog: one focus
 * scope, one dismiss contract (Esc, backdrop, Close).
 *
 * The drawer/sheet slide and the cart/panel shift are CSS animations on Radix's
 * `data-state` and on mount — no animation library needed. See
 * `docs/agents/minicart-flyout-direction.md`.
 *
 * @param props.open - Dialog open state, owned by the host.
 * @param props.onOpenChange - Radix's open-change callback (Esc/backdrop/Close).
 * @param props.cart - The cart model the list and edit panel read/write.
 */
export default function MinicartFlyout({
  open,
  onOpenChange,
  cart,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  cart: CartModel
}) {
  const [view, setView] = useState<"cart" | "edit">("cart")
  const [editingId, setEditingId] = useState<string | null>(null)
  // Only the return from the edit panel animates; the initial open rides in
  // with the sheet's own slide instead of sliding in on its own.
  const [returning, setReturning] = useState(false)
  const returnFocusId = useRef<string | null>(null)
  const firstFieldRef = useRef<HTMLInputElement | null>(null)

  // A closed flyout always reopens on the cart list. Reset on the dismiss that
  // closes it rather than in an effect, so no state is set while rendering.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setView("cart")
      setEditingId(null)
      setReturning(false)
    }
    onOpenChange(next)
  }

  // Entering the edit panel moves focus into the form. Returning focuses the
  // Edit control that opened it, so the journey round-trips without a mouse.
  useEffect(() => {
    if (view === "edit") {
      const timer = window.setTimeout(() => firstFieldRef.current?.focus(), 0)
      return () => window.clearTimeout(timer)
    }
    const id = returnFocusId.current
    if (!id) return
    const timer = window.setTimeout(
      () => document.getElementById(id)?.focus(),
      0
    )
    return () => window.clearTimeout(timer)
  }, [view, editingId])

  const startEdit = (collectorId: string) => {
    returnFocusId.current = `edit-${collectorId}`
    setReturning(false)
    setEditingId(collectorId)
    setView("edit")
  }

  const endEdit = () => {
    setView("cart")
    setEditingId(null)
    setReturning(true)
  }

  const editing =
    editingId !== null
      ? cart.entries.find((entry) => entry.id === editingId)
      : undefined
  const collector =
    editing && editing.kind === "collector" ? editing : undefined
  const primary = collector
    ? cart.entries.find(
        (entry): entry is PricedLine =>
          entry.id === collector.parentId && entry.kind === "product"
      )
    : undefined

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange} modal>
      <Dialog.Portal>
        <Dialog.Overlay className={s.overlay} />
        <Dialog.Content className={s.sheet} aria-describedby={undefined}>
          <VisuallyHidden asChild>
            <Dialog.Title>
              {view === "edit" ? "Edit registration" : "Your cart"}
            </Dialog.Title>
          </VisuallyHidden>

          {view === "edit" && collector && primary ? (
            <EditPanel
              key={collector.id}
              collector={collector}
              primary={primary}
              firstFieldRef={firstFieldRef}
              onSave={(answers, quantity) => {
                cart.saveCollector(collector.id, answers, quantity)
                endEdit()
              }}
              onCancel={endEdit}
            />
          ) : (
            <div
              key="cart"
              className={clsx(s.cartView, returning && s.cartReturn)}
            >
              <CartPanel
                cart={cart}
                onEdit={(collectorId) => startEdit(collectorId)}
                onClose={() => onOpenChange(false)}
              />
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
