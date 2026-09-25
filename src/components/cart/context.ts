"use client"

import { createContext, useContext } from "react"

import type { CartEntry } from "@/lib/checkout/cart-entries"
import type { CartAddGroup, CartModel } from "@/lib/checkout/cart-mutations"

/**
 * The browser-held cart's React context.
 *
 * Split from the provider so the feature's sub-components can read the cart
 * without importing the feature's entry point (which mounts the flyout) — a
 * cycle, otherwise. The provider in `index.tsx` is the only writer of this
 * context; everything else reads it.
 */

export type CartContextValue = {
  /** The `client_reference_id` the checkout snapshot is keyed by. */
  cartRef: string
  /** The cart's flat entry list, in add order. */
  entries: CartEntry[]
  /** The buyer-entered promotion code, applied at the session build. */
  promotionCode: string
  /** The derived views every surface renders against. */
  model: CartModel
  /** Whether the flyout is open. */
  open: boolean
  setOpen: (open: boolean) => void
  /**
   * Commits a fully specified add-to-cart action and opens the flyout.
   *
   * @param group - The PDP's primaries, add-ons, and collector payload.
   * @param sourcePdp - The PDP slug the action came from (a reporting tag).
   */
  addToCart: (group: CartAddGroup, sourcePdp: string) => void
  setQuantity: (id: string, quantity: number) => void
  remove: (id: string) => void
  /** Writes the buyer-entered promotion code; an empty string clears it. */
  setPromotionCode: (code: string) => void
  /** Writes a registration's answers and its primary line's quantity together. */
  saveCollector: (
    collectorId: string,
    answers: Record<string, unknown>,
    quantity: number
  ) => void
}

export const CartContext = createContext<CartContextValue | null>(null)

/**
 * Reads the browser-held cart.
 *
 * @returns The cart state and mutations.
 * @throws When called outside the `(core)` layout's `CartProvider`.
 */
export function useCart(): CartContextValue {
  const value = useContext(CartContext)
  if (!value) {
    throw new Error("useCart must be used inside <CartProvider>")
  }
  return value
}
