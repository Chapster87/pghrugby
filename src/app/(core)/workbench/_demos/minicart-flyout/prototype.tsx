"use client"

import { useState } from "react"
import clsx from "clsx"
import { ShoppingCart } from "lucide-react"

import Button from "@components/button"

import {
  EMPTY_CART,
  GOLF_CART,
  MIXED_CART,
  money,
  pigRoastLine,
  type CartEntry,
} from "./data"
import MinicartFlyout from "./flyout"
import { usePrototypeCart } from "./store"
import s from "./style.module.css"

const SEEDS: { key: string; label: string; entries: CartEntry[] }[] = [
  { key: "mixed", label: "Mixed cart", entries: MIXED_CART },
  { key: "golf", label: "Golf only", entries: GOLF_CART },
  { key: "empty", label: "Empty", entries: EMPTY_CART },
]

/**
 * PROTOTYPE (chosen) — the minicart flyout, retained as the implementation
 * reference from wayfinder ticket #63, hosted on a mock storefront so it can be
 * judged against real page chrome. Dev-only: registered on the workbench, which
 * never serves in production.
 *
 * Auto-open after add-to-cart, the header cart button with its count, Esc /
 * backdrop / Close, the drawer slide, and the focus round-trip into the edit
 * panel are all live.
 */
export default function MinicartFlyoutPrototype() {
  const [seedKey, setSeedKey] = useState("mixed")
  const cart = usePrototypeCart(MIXED_CART)
  const [open, setOpen] = useState(true)

  const loadSeed = (key: string) => {
    const seed = SEEDS.find((entry) => entry.key === key)
    if (!seed) return
    setSeedKey(key)
    cart.reset(seed.entries)
  }

  const addTickets = () => {
    cart.add(pigRoastLine(2))
    setOpen(true)
  }

  return (
    <div className={s.prototype}>
      <div className={s.toolbar}>
        <span className={s.toolbarLabel}>Fixture</span>
        <div className={s.toggle}>
          {SEEDS.map((seed) => (
            <button
              key={seed.key}
              type="button"
              className={clsx(
                s.toggleButton,
                seed.key === seedKey && s.toggleButtonActive
              )}
              aria-pressed={seed.key === seedKey}
              onClick={() => loadSeed(seed.key)}
            >
              {seed.label}
            </button>
          ))}
        </div>
        <p className={s.toolbarHint}>
          The flyout is open on load. Switch fixtures, then use the storefront
          below to close it, re-open it from the cart button, or add a ticket to
          watch it auto-open. A registration line&apos;s Edit slides the same
          Dialog to the collector form.
        </p>
      </div>

      <div className={s.storeBar}>
        <span className={s.storeMark}>Forge Store</span>
        <button
          type="button"
          className={s.storeCart}
          onClick={() => setOpen(true)}
        >
          <ShoppingCart size={18} aria-hidden />
          Cart
          <span className={s.storeCount}>{cart.itemCount}</span>
        </button>
      </div>

      <div className={s.storeBody}>
        <article className={s.productCard}>
          <div className={s.productMedia} aria-hidden>
            PR
          </div>
          <div className={s.productBody}>
            <h3 className={s.productTitle}>Annual Forge Pig Roast</h3>
            <p className={s.productMeta}>
              Saturday, November 7 · Forge Clubhouse
            </p>
            <p className={s.productText}>
              Tickets are per person. Adding opens the flyout automatically —
              the add-to-cart path a real PDP would trigger.
            </p>
            <div className={s.productActions}>
              <Button onClick={addTickets}>Add to cart · {money(2500)}</Button>
              <span className={s.productNote}>
                Two tickets, merges into an existing line
              </span>
            </div>
          </div>
        </article>
      </div>

      <MinicartFlyout open={open} onOpenChange={setOpen} cart={cart} />
    </div>
  )
}
