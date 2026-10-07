"use client"

import { useEffect, useState } from "react"

import type { CartEntry } from "@/lib/checkout/cart-entries"
import type { CartDiscount } from "@/lib/checkout/sc7s-discount"

/**
 * Resolves the cart's SC7s discount for display.
 *
 * The discount is applied at the session build and the amounts live in Stripe,
 * so it cannot be copied into the client: this calls the read-only validate
 * route (`POST /api/checkout/cart`) with the current entries and promotion code
 * and reads back the resolved discount. It re-runs whenever the cart changes, so
 * the row tracks edits rather than freezing at the last checkout attempt.
 *
 * The call is debounced, and gated on the flyout being open — a closed flyout
 * shows nothing and should not cost a request per edit.
 *
 * @param cartRef - The browser cart's reference.
 * @param entries - The cart's entries, in add order.
 * @param promotionCode - The buyer-entered promotion code, if any.
 * @param enabled - Whether to resolve at all (the flyout is open).
 * @returns The resolved discount, or null when there is none or it cannot be priced.
 */

/** True when a value is shaped like `CartDiscount`. */
function isCartDiscount(value: unknown): value is CartDiscount {
  if (!value || typeof value !== "object") return false
  const discount = value as {
    amount?: unknown
    label?: unknown
    perLine?: unknown
  }
  return (
    typeof discount.amount === "number" &&
    typeof discount.label === "string" &&
    !!discount.perLine &&
    typeof discount.perLine === "object"
  )
}

export function useCartDiscount(
  cartRef: string,
  entries: CartEntry[],
  promotionCode: string,
  enabled: boolean
): CartDiscount | null {
  const [discount, setDiscount] = useState<CartDiscount | null>(null)

  // A stable dependency: the caller passes a fresh array each render.
  const key = `${promotionCode}|${JSON.stringify(entries)}`

  useEffect(() => {
    let cancelled = false
    const active = enabled && entries.length > 0
    // Debounced: a quantity click or a code keystroke should settle before the
    // validate call goes out, and only the last one matters. The clearing case
    // goes through the same timer so no state is set synchronously in the effect.
    const timer = window.setTimeout(
      async () => {
        if (!active) {
          setDiscount(null)
          return
        }
        try {
          const res = await fetch("/api/checkout/cart", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ cartRef, entries, promotionCode }),
          })
          const data = (await res.json()) as { discount?: unknown }
          if (cancelled) return
          setDiscount(
            res.ok && isCartDiscount(data?.discount) ? data.discount : null
          )
        } catch {
          if (!cancelled) setDiscount(null)
        }
      },
      active ? 200 : 0
    )

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
    // `key` captures entries + promotionCode; `entries` identity is not stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled, cartRef])

  return discount
}
