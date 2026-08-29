"use client"

import { useState } from "react"

import Button from "@/components/button"
import Heading from "@/components/typography/heading"
import { CHECKOUT_CATALOG } from "@/lib/checkout/catalog"
import type { CheckoutCart } from "@/lib/checkout/cart-store"
import { useRouter } from "next/navigation"

import contentStyles from "@/styles/content.module.css"
import s from "./styles.module.css"

/**
 * Cart — build your order.
 *
 * The server builds the cart (`POST /api/checkout/cart`) from these
 * selections; amounts are authoritative from the server catalog and never
 * client-dictated. The golf outing and Steel City 7s registration forms have
 * moved to their own product pages — this cart handles season dues plus an
 * optional fixed-amount club donation.
 */

export default function CartPage() {
  const router = useRouter()

  // Season dues + optional fixed-amount donation preset.
  const [seasonSku, setSeasonSku] = useState<string>(
    CHECKOUT_CATALOG.dues.fall.sku
  )
  const [donationIndex, setDonationIndex] = useState<string>("none")

  const [cart, setCart] = useState<CheckoutCart | null>(null)
  const [building, setBuilding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buildCart = async () => {
    setBuilding(true)
    setError(null)
    try {
      const selections = [{ sku: seasonSku, quantity: 1 }]
      if (donationIndex !== "none") {
        selections.push({
          sku: CHECKOUT_CATALOG.donationPresets[Number(donationIndex)].sku,
          quantity: 1,
        })
      }
      const res = await fetch("/api/checkout/cart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pdp: "dues", selections }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Failed to build cart")
        return
      }
      setCart(data.cart)
    } catch {
      setError("Network error building cart")
    } finally {
      setBuilding(false)
    }
  }

  const toCheckout = () => {
    if (cart) router.push(`/checkout?cartRef=${cart.cartRef}`)
  }

  return (
    <div className={s.cartPage}>
      <div className={contentStyles.primary}>
        <div className={`${contentStyles.contentBlock} ${s.cartContent}`}>
          <Heading level="h1">Cart</Heading>
          <p className={s.intro}>
            Build your order below, then check out securely with Stripe. Rates
            are set by the club. Golf outing and tournament registrations live
            on their own pages.
          </p>

          <section className={s.section}>
            <Heading level="h2" display="h3">
              Season dues
            </Heading>
            <p className={s.description}>
              Pick your season, then add an optional fixed-amount club donation
              to the same payment.
            </p>

            <div className={s.field}>
              <label className={s.fieldLabel} htmlFor="season">
                Season
              </label>
              <select
                id="season"
                className={s.select}
                value={seasonSku}
                onChange={(e) => setSeasonSku(e.target.value)}
              >
                {Object.values(CHECKOUT_CATALOG.dues).map((season) => (
                  <option key={season.sku} value={season.sku}>
                    {season.label} — ${(season.unitAmount / 100).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            <div className={s.field}>
              <label className={s.fieldLabel} htmlFor="donation">
                Club donation
              </label>
              <select
                id="donation"
                className={s.select}
                value={donationIndex}
                onChange={(e) => setDonationIndex(e.target.value)}
              >
                <option value="none">None</option>
                {CHECKOUT_CATALOG.donationPresets.map((preset, i) => (
                  <option key={preset.sku} value={i}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={s.actions}>
              <Button
                onClick={buildCart}
                disabled={building}
                data-testid="build-dues-cart"
              >
                Build cart
              </Button>
            </div>
          </section>

          {error && <div className={s.error}>{error}</div>}
        </div>
      </div>

      <div className={contentStyles.secondary}>
        <div className={contentStyles.contentBlock}>
          {cart ? (
            <>
              <Heading level="h2" display="h3">
                Order summary
              </Heading>
              <p className={s.description}>
                Amounts are authoritative from the server catalog — the client
                never dictated them.
              </p>
              <ul className={s.itemList}>
                {cart.items.map((item) => (
                  <li key={item.sku} className={s.itemRow}>
                    <span className={s.itemLabel}>
                      {item.label}{" "}
                      {item.quantity > 1 && (
                        <span className={s.itemQty}>× {item.quantity}</span>
                      )}
                    </span>
                    <span className={s.itemPrice}>
                      ${((item.unitAmount * item.quantity) / 100).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className={s.total}>
                <span>Total</span>
                <span>${(cart.total / 100).toFixed(2)}</span>
              </div>
              <Button
                onClick={toCheckout}
                size="large"
                className={s.payButton}
                data-testid="pay-with-stripe"
              >
                Pay with Stripe →
              </Button>
            </>
          ) : (
            <p className={s.empty}>
              Build a cart on the left to see your order summary here.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
