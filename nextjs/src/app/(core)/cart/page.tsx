"use client"

import { useState } from "react"

import Button from "@/components/button"
import Heading from "@/components/typography/heading"
import { CHECKOUT_CATALOG, CHECKOUT_MAX_GOLFERS } from "@/lib/checkout/catalog"
import type { CheckoutCart } from "@/lib/checkout/cart-store"
import { useRouter } from "next/navigation"

import contentStyles from "@/styles/content.module.css"
import s from "./styles.module.css"

/**
 * Cart — build your order.
 *
 * The server builds the cart (`POST /api/checkout/cart`) from these
 * selections; amounts are authoritative from the server catalog and never
 * client-dictated. Registration flows (golf, tournament) collect their form
 * payload here; it rides beside the session and is re-joined at record time
 * via client_reference_id.
 */

type GolferRow = { name: string; email: string }

export default function CartPage() {
  const router = useRouter()

  // Season dues + optional fixed-amount donation preset.
  const [donationIndex, setDonationIndex] = useState<string>("none")

  // Golf outing: quantity + captain + per-golfer rows + add-ons.
  const [quantity, setQuantity] = useState(1)
  const [captain, setCaptain] = useState<GolferRow>({ name: "", email: "" })
  const [golfers, setGolfers] = useState<GolferRow[]>([{ name: "", email: "" }])
  const [addons, setAddons] = useState<string[]>([])

  // Tournament: division + team payload.
  const [division, setDivision] = useState<string>(
    CHECKOUT_CATALOG.tournament.divisions[0].sku
  )
  const [teamName, setTeamName] = useState("")
  const [contact, setContact] = useState<GolferRow>({ name: "", email: "" })

  const [cart, setCart] = useState<CheckoutCart | null>(null)
  const [building, setBuilding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Keeps the golfer rows in sync with the quantity field. */
  const changeQuantity = (value: number) => {
    const clamped = Math.min(Math.max(1, value), CHECKOUT_MAX_GOLFERS)
    setQuantity(clamped)
    setGolfers((prev) => {
      const next = [...prev]
      while (next.length < clamped) next.push({ name: "", email: "" })
      while (next.length > clamped) next.pop()
      return next
    })
  }

  const setGolfer = (index: number, field: keyof GolferRow, value: string) => {
    setGolfers((prev) =>
      prev.map((g, i) => (i === index ? { ...g, [field]: value } : g))
    )
  }

  const toggleAddon = (key: string) => {
    setAddons((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  const buildCart = async (flow: "dues" | "golf" | "tournament") => {
    setBuilding(true)
    setError(null)
    try {
      const res = await fetch("/api/checkout/cart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          flow,
          donationPresetIndex:
            flow === "dues" && donationIndex !== "none"
              ? Number(donationIndex)
              : undefined,
          quantity: flow === "golf" ? quantity : undefined,
          addons: flow === "golf" ? addons : undefined,
          captain: flow === "golf" ? captain : undefined,
          golfers: flow === "golf" ? golfers : undefined,
          division: flow === "tournament" ? division : undefined,
          teamName: flow === "tournament" ? teamName : undefined,
          contact: flow === "tournament" ? contact : undefined,
        }),
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
            are set by the club.
          </p>

          <section className={s.section}>
            <Heading level="h2" display="h3">
              Season dues
            </Heading>
            <p className={s.description}>
              {CHECKOUT_CATALOG.dues.label} —{" "}
              <strong>
                ${(CHECKOUT_CATALOG.dues.unitAmount / 100).toFixed(2)}
              </strong>
              . Add an optional fixed-amount club donation to the same payment.
            </p>
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
            <div className={s.actions}>
              <Button
                onClick={() => buildCart("dues")}
                disabled={building}
                data-testid="build-dues-cart"
              >
                Build dues cart
              </Button>
            </div>
          </section>

          <section className={s.section}>
            <Heading level="h2" display="h3">
              Golf outing registration
            </Heading>
            <p className={s.description}>
              <strong>
                $
                {(CHECKOUT_CATALOG.golf.registration.unitAmount / 100).toFixed(
                  2
                )}
              </strong>{" "}
              per golfer. Add-ons (mulligan, drink band) are fixed prices in the
              same payment.
            </p>

            <div className={s.field}>
              <label className={s.fieldLabel} htmlFor="golfers">
                Number of golfers
              </label>
              <input
                id="golfers"
                className={s.input}
                type="number"
                min={1}
                max={CHECKOUT_MAX_GOLFERS}
                value={quantity}
                onChange={(e) => changeQuantity(Number(e.target.value))}
              />
            </div>

            <div className={s.field}>
              <label className={s.fieldLabel} htmlFor="captain-name">
                Captain name
              </label>
              <input
                id="captain-name"
                className={s.input}
                value={captain.name}
                onChange={(e) =>
                  setCaptain({ ...captain, name: e.target.value })
                }
              />
            </div>
            <div className={s.field}>
              <label className={s.fieldLabel} htmlFor="captain-email">
                Captain email
              </label>
              <input
                id="captain-email"
                className={s.input}
                type="email"
                value={captain.email}
                onChange={(e) =>
                  setCaptain({ ...captain, email: e.target.value })
                }
              />
            </div>

            <div className={s.golferRows}>
              {golfers.map((golfer, i) => (
                <div key={i} className={s.golferRow}>
                  <span className={s.golferIndex}>{i + 1}</span>
                  <input
                    className={s.input}
                    placeholder="Golfer name"
                    value={golfer.name}
                    onChange={(e) => setGolfer(i, "name", e.target.value)}
                  />
                  <input
                    className={s.input}
                    placeholder="Golfer email"
                    type="email"
                    value={golfer.email}
                    onChange={(e) => setGolfer(i, "email", e.target.value)}
                  />
                </div>
              ))}
            </div>

            <fieldset className={s.addons}>
              <legend className={s.fieldLabel}>Add-ons</legend>
              {(["mulligan", "drinkBand"] as const).map((key) => (
                <label key={key} className={s.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={addons.includes(key)}
                    onChange={() => toggleAddon(key)}
                  />
                  {CHECKOUT_CATALOG.golf[key].label} — $
                  {(CHECKOUT_CATALOG.golf[key].unitAmount / 100).toFixed(2)}
                </label>
              ))}
            </fieldset>

            <div className={s.actions}>
              <Button
                onClick={() => buildCart("golf")}
                disabled={building}
                data-testid="build-golf-cart"
              >
                Build golf cart
              </Button>
            </div>
          </section>

          <section className={s.section}>
            <Heading level="h2" display="h3">
              Steel City 7s tournament entry
            </Heading>
            <p className={s.description}>
              One team entry per division. Rates: $350 entry, $325 additional
              side (the +$50 late rate is an operational price swap at the
              deadline).
            </p>

            <div className={s.field}>
              <label className={s.fieldLabel} htmlFor="division">
                Division
              </label>
              <select
                id="division"
                className={s.select}
                value={division}
                onChange={(e) => setDivision(e.target.value)}
              >
                {CHECKOUT_CATALOG.tournament.divisions.map((d) => (
                  <option key={d.sku} value={d.sku}>
                    {d.label} — ${(d.unitAmount / 100).toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            <div className={s.field}>
              <label className={s.fieldLabel} htmlFor="team-name">
                Team name
              </label>
              <input
                id="team-name"
                className={s.input}
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
              />
            </div>
            <div className={s.field}>
              <label className={s.fieldLabel} htmlFor="contact-name">
                Contact name
              </label>
              <input
                id="contact-name"
                className={s.input}
                value={contact.name}
                onChange={(e) =>
                  setContact({ ...contact, name: e.target.value })
                }
              />
            </div>
            <div className={s.field}>
              <label className={s.fieldLabel} htmlFor="contact-email">
                Contact email
              </label>
              <input
                id="contact-email"
                className={s.input}
                type="email"
                value={contact.email}
                onChange={(e) =>
                  setContact({ ...contact, email: e.target.value })
                }
              />
            </div>

            <div className={s.actions}>
              <Button
                onClick={() => buildCart("tournament")}
                disabled={building}
                data-testid="build-tournament-cart"
              >
                Build tournament cart
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
