"use client"

import { useCallback, useMemo, useState, useSyncExternalStore } from "react"

import {
  deriveCartModel,
  type CartAddGroup,
} from "@/lib/checkout/cart-mutations"
import { findCatalogItem } from "@/lib/checkout/catalog"

import MinicartFlyout from "./_components/minicart-flyout"
import {
  cartStore,
  getCartServerSnapshot,
  getCartSnapshot,
  subscribeToCart,
} from "./cart-store"
import { CartContext, type CartContextValue } from "./context"

export { useCart } from "./context"
export { default as CartTrigger } from "./_components/cart-trigger"

/**
 * The browser-held cart — the storefront's cart feature.
 *
 * The state itself lives in `cart-store.ts`, an external store backed by
 * `localStorage` and read through `useSyncExternalStore`, so the server render,
 * the hydration render, and the live render can never disagree. This provider
 * adds only what React owns: the flyout's open state, the derived display model,
 * and the action callbacks.
 *
 * Mounted once in the `(core)` layout, so the header trigger, every PDP, and the
 * flyout share one cart. The flyout is rendered here, so it exists wherever the
 * provider does and animates over whatever page is showing.
 *
 * See `docs/pdp-to-minicart-to-checkout-spec.md` § 6.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const { cartRef, entries } = useSyncExternalStore(
    subscribeToCart,
    getCartSnapshot,
    getCartServerSnapshot
  )
  const [open, setOpen] = useState(false)

  const addToCart = useCallback((group: CartAddGroup, sourcePdp: string) => {
    cartStore.add(group, sourcePdp)
    setOpen(true)
  }, [])

  // Display amounts come from the shared catalog — the same sku → amount map
  // the server bills from. The server re-resolves at session build, so a stale
  // browser tab can only mis-display a total, never mis-charge one.
  const model = useMemo(
    () =>
      deriveCartModel(entries, (sku) => findCatalogItem(sku)?.unitAmount ?? 0),
    [entries]
  )

  const value = useMemo<CartContextValue>(
    () => ({
      cartRef,
      entries,
      model,
      open,
      setOpen,
      addToCart,
      setQuantity: cartStore.setQuantity,
      remove: cartStore.remove,
      saveCollector: cartStore.saveCollector,
    }),
    [cartRef, entries, model, open, addToCart]
  )

  return (
    <CartContext.Provider value={value}>
      {children}
      <MinicartFlyout />
    </CartContext.Provider>
  )
}
