"use client"

import { ShoppingCart } from "lucide-react"

import { useCart } from "../../context"
import s from "./style.module.css"

/**
 * The header's Cart control — a button that opens the flyout in place (no
 * navigation) and carries the cart's item count, per
 * `docs/agents/minicart-flyout-direction.md` § 6.
 *
 * The chrome stays with the header (pass `className`, e.g. the nav-link button
 * treatment), so the control matches its neighbours; this component owns only
 * the behaviour and the count badge.
 *
 * The count arrives with the cart's client snapshot: the server and hydration
 * renders read the empty server snapshot, so the badge appears a tick after
 * hydration rather than risking a markup mismatch inside the chrome.
 */
export default function CartTrigger({ className }: { className?: string }) {
  const { model, setOpen } = useCart()
  const count = model.itemCount

  return (
    <button
      type="button"
      className={className}
      onClick={() => setOpen(true)}
      data-testid="nav-cart-link"
      aria-label={
        count > 0 ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart"
      }
    >
      <ShoppingCart size={18} aria-hidden />
      Cart
      {count > 0 && <span className={s.cartCount}>{count}</span>}
    </button>
  )
}
