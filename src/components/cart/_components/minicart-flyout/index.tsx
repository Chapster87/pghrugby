"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import clsx from "clsx"
import { X } from "lucide-react"

import Button from "@components/button"
import Sheet from "@components/sheet"
import {
  isCollectorEntry,
  isPricedLine,
  type CollectorEntry,
  type PricedLine,
} from "@/lib/checkout/cart-entries"
import { displayFor, formatMoney } from "@/lib/checkout/cart-display"
import type { CartLineError } from "@/lib/checkout/cart-pricing"
import { canUsePromotionCode } from "@/lib/checkout/sc7s-discount"

import { useLinePricing } from "../../_hooks/use-line-pricing"
import { useLineThumbnails } from "../../_hooks/use-line-thumbnails"
import { useCart } from "../../context"
import CartLineCard from "../cart-line-card"
import EditPanel from "../edit-panel"
import RefusedLines from "../refused-lines"
import s from "./style.module.css"

/**
 * The minicart flyout — the storefront's only cart surface.
 *
 * One Sheet (a Radix Dialog) holding `view: cart | edit`, per
 * `docs/agents/minicart-flyout-direction.md` § 2 and
 * `docs/agents/registration-editing.md` § 5: choosing Edit swaps the same panel
 * to the collector form, so there is one focus scope and one dismiss contract
 * for the whole journey. It opens on add-to-cart and from the header trigger.
 *
 * Rendered by `CartProvider`, so it exists wherever the provider does and
 * animates over whatever page is showing.
 */
export default function MinicartFlyout() {
  const {
    model,
    open,
    setOpen,
    entries,
    cartRef,
    promotionCode,
    remove,
    saveCollector,
    setPromotionCode,
  } = useCart()
  const router = useRouter()

  const [view, setView] = useState<"cart" | "edit">("cart")
  const [editingId, setEditingId] = useState<string | null>(null)
  // Only the return from the edit panel animates; the initial open rides in
  // with the sheet's own slide.
  const [returning, setReturning] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  // Per-line refusals from the validate call — a sold-out line is named and
  // removable here rather than being silently dropped from the total.
  const [lineErrors, setLineErrors] = useState<CartLineError[]>([])
  const returnFocusId = useRef<string | null>(null)
  // The promotion-code field is uncontrolled and commits on blur / Apply, so a
  // code is one persisted write rather than one per keystroke.
  const promotionRef = useRef<HTMLInputElement>(null)

  // Resolved only while the flyout is open: the resolution reaches Stripe, and
  // a closed flyout showing nothing should not cost a request per page load.
  const thumbnails = useLineThumbnails(
    open ? model.lines.map((line) => line.sku) : []
  )
  const pricing = useLinePricing(
    open ? model.lines.map((line) => line.sku) : []
  )

  // The subtotal the flyout shows is the display subtotal, so it agrees with the
  // line amounts beside it and with what Checkout will bill.
  const subtotal = model.lines.reduce(
    (sum, line) =>
      sum + displayFor(line.sku, pricing).unitAmount * line.quantity,
    0
  )

  // A closed flyout always reopens on the cart list. Reset on the dismiss that
  // closes it rather than in an effect, so no state is set while rendering.
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setView("cart")
      setEditingId(null)
      setReturning(false)
      setCheckoutError(null)
      setLineErrors([])
    }
    setOpen(next)
  }

  // Returning to the list focuses the Edit control that opened the panel, so the
  // journey round-trips without a mouse.
  useEffect(() => {
    if (view !== "cart") return
    const id = returnFocusId.current
    if (!id) return
    const timer = window.setTimeout(
      () => document.getElementById(id)?.focus(),
      0
    )
    return () => window.clearTimeout(timer)
  }, [view, editingId])

  const startEdit = (collectorId: string) => {
    returnFocusId.current = `cart-edit-${collectorId}`
    setReturning(false)
    setEditingId(collectorId)
    setView("edit")
  }

  const endEdit = () => {
    setEditingId(null)
    setView("cart")
    setReturning(true)
  }

  const collector: CollectorEntry | undefined =
    editingId !== null
      ? entries.find(
          (entry): entry is CollectorEntry =>
            isCollectorEntry(entry) && entry.id === editingId
        )
      : undefined
  const primary: PricedLine | undefined = collector
    ? entries.find(
        (entry): entry is PricedLine =>
          isPricedLine(entry) && entry.id === collector.parentId
      )
    : undefined

  /**
   * Validates the browser-held cart before handing off to Stripe: the server
   * resolves every line against DatoCMS and answers a sold-out or unpriced line
   * with a per-line error, which the buyer clears by removing that line.
   *
   * Nothing is persisted here — the `carts` snapshot is written at session
   * build, so what `recordOrder` re-joins by `client_reference_id` is the
   * checkout-time cart.
   */
  const checkout = async () => {
    setCheckingOut(true)
    setCheckoutError(null)
    setLineErrors([])
    try {
      const res = await fetch("/api/checkout/cart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cartRef, entries }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCheckoutError(data.error ?? "Could not start checkout")
        setLineErrors(Array.isArray(data.errors) ? data.errors : [])
        return
      }
      handleOpenChange(false)
      router.push(`/checkout?cartRef=${encodeURIComponent(cartRef)}`)
    } catch {
      setCheckoutError("Network error starting checkout")
    } finally {
      setCheckingOut(false)
    }
  }

  /** Commits the field's current text to the cart; an empty field clears it. */
  const commitPromotionCode = () => {
    setPromotionCode(promotionRef.current?.value ?? "")
  }

  /** Removes a refused line (cascading, like any primary) and clears its error. */
  const removeRefusedLine = (entryId: string) => {
    remove(entryId)
    setLineErrors((previous) =>
      previous.filter((error) => error.entryId !== entryId)
    )
  }

  const empty = model.primaries.length === 0

  return (
    <Sheet
      open={open}
      onOpenChange={handleOpenChange}
      title={view === "edit" ? "Edit registration" : "Your cart"}
    >
      {view === "edit" && collector && primary ? (
        <EditPanel
          key={collector.id}
          collector={collector}
          primary={primary}
          onSave={(answers, quantity) => {
            saveCollector(collector.id, answers, quantity)
            endEdit()
          }}
          onBack={endEdit}
        />
      ) : (
        <div className={clsx(s.cartView, returning && s.cartReturn)}>
          <header className={s.head}>
            <h2 className={s.headTitle}>
              Cart
              {model.itemCount > 0 && (
                <span className={s.headPill}>
                  {model.itemCount} {model.itemCount === 1 ? "item" : "items"}
                </span>
              )}
            </h2>
            <button
              type="button"
              className={s.close}
              onClick={() => handleOpenChange(false)}
              aria-label="Close cart"
            >
              <X size={20} aria-hidden />
            </button>
          </header>

          {empty ? (
            <div className={s.empty}>
              <div className={s.emptyCard}>
                <p className={s.emptyTitle}>Nothing here yet</p>
                <p className={s.emptyText}>
                  Add a ticket or registration and it will appear as a card.
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => handleOpenChange(false)}
              >
                Keep browsing
              </Button>
            </div>
          ) : (
            <>
              <div className={s.body}>
                {model.groups.map((group) => (
                  <CartLineCard
                    key={group.key}
                    group={group}
                    thumbnails={thumbnails}
                    pricing={pricing}
                    onEdit={startEdit}
                  />
                ))}
              </div>

              <footer className={s.foot}>
                <div className={s.subtotalRow}>
                  <span>Subtotal</span>
                  <span>{formatMoney(subtotal)}</span>
                </div>
                {/* Entered here and carried to the session build, which resolves
                    it against Stripe and applies it only when the cart does not
                    already qualify for the SC7s coupon. */}
                <form
                  className={s.promo}
                  onSubmit={(event) => {
                    event.preventDefault()
                    commitPromotionCode()
                  }}
                >
                  <label className={s.promoLabel} htmlFor="cart-promotion-code">
                    Promotion code
                  </label>
                  <div className={s.promoRow}>
                    <input
                      ref={promotionRef}
                      id="cart-promotion-code"
                      className={s.promoInput}
                      type="text"
                      name="promotionCode"
                      defaultValue={promotionCode}
                      placeholder="Add a code"
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      onBlur={commitPromotionCode}
                    />
                    <Button variant="secondary" type="submit">
                      Apply
                    </Button>
                  </div>
                  {promotionCode && canUsePromotionCode(entries) && (
                    <p className={s.promoNote}>
                      “{promotionCode}” will be applied at checkout.
                    </p>
                  )}
                </form>
                <RefusedLines
                  message={checkoutError}
                  errors={lineErrors}
                  onRemove={removeRefusedLine}
                />
                <Button
                  size="large"
                  className={s.checkout}
                  isLoading={checkingOut}
                  onClick={checkout}
                >
                  Checkout
                </Button>
              </footer>
            </>
          )}
        </div>
      )}
    </Sheet>
  )
}
