"use client"

import { useState } from "react"

import {
  PROTOTYPE_CATALOG,
  PROTOTYPE_MAX_GOLFERS,
} from "@/lib/prototype-stripe/catalog"
import type { PrototypeCart } from "@/lib/prototype-stripe/store"

import { useRouter } from "next/navigation"

import styles from "../prototype.module.css"

/**
 * PROTOTYPE — stub cart page.
 *
 * Demonstrates the two cases from the ticket:
 *   A) grouped product: season dues + optional fixed-amount club donation
 *   B) registration: golf outing with quantity + per-golfer form payload
 *
 * The cart itself is built server-side (`POST /api/prototype/cart`) — the
 * client only sends selections; the server returns the computed items/total.
 */
export default function CartPage() {
  const router = useRouter()
  const [flow, setFlow] = useState<"dues-donation" | "golf">("dues-donation")
  const [donationIndex, setDonationIndex] = useState<string>("none")
  const [quantity, setQuantity] = useState(1)
  const [golfers, setGolfers] = useState([{ name: "", email: "" }])
  const [cart, setCart] = useState<PrototypeCart | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [building, setBuilding] = useState(false)

  const buildCart = async (targetFlow: "dues-donation" | "golf") => {
    setBuilding(true)
    setError(null)
    try {
      const res = await fetch("/api/prototype/cart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          // The flow is explicit here — reading it from state would use the
          // stale render-scope value and can build the wrong case's cart.
          flow: targetFlow,
          donationIndex:
            targetFlow === "dues-donation" ? Number(donationIndex) : undefined,
          quantity,
          golfers: targetFlow === "golf" ? golfers : undefined,
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

  /** Keeps the golfer rows in sync with the quantity field. */
  const changeQuantity = (value: number) => {
    const clamped = Math.min(Math.max(1, value), PROTOTYPE_MAX_GOLFERS)
    setQuantity(clamped)
    setGolfers((prev) => {
      const next = [...prev]
      while (next.length < clamped) next.push({ name: "", email: "" })
      while (next.length > clamped) next.pop()
      return next
    })
  }

  const setGolfer = (index: number, field: "name" | "email", value: string) => {
    setGolfers((prev) =>
      prev.map((g, i) => (i === index ? { ...g, [field]: value } : g))
    )
  }

  return (
    <>
      <h1>Stripe spike — stub cart</h1>

      <section className={styles.card}>
        <h2>Case A — Season dues + optional donation</h2>
        <p>
          One fixed-price dues line item, plus an optional fixed-amount donation
          preset. (A true pay-what-you-want amount can never share the session —
          see the research.)
        </p>
        <div className={styles.field}>
          <label htmlFor="donation">Club donation</label>
          <select
            id="donation"
            value={donationIndex}
            onChange={(e) => setDonationIndex(e.target.value)}
          >
            <option value="none">None</option>
            {PROTOTYPE_CATALOG.donationPresets.map((preset, i) => (
              <option key={preset.unitAmount} value={i}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>
        <button
          className={styles.primary}
          onClick={() => {
            setFlow("dues-donation")
            void buildCart("dues-donation")
          }}
          disabled={building}
        >
          Build cart (dues + donation)
        </button>
      </section>

      <section className={styles.card}>
        <h2>Case B — Golf outing registration</h2>
        <p>
          Quantity N golfers at the registration price; per-golfer form payload
          is collected here and travels beside the session (joined back by
          client_reference_id), never in Stripe metadata.
        </p>
        <div className={styles.field}>
          <label htmlFor="quantity">Number of golfers</label>
          <input
            id="quantity"
            type="number"
            min={1}
            max={PROTOTYPE_MAX_GOLFERS}
            value={quantity}
            onChange={(e) => changeQuantity(Number(e.target.value))}
          />
          <small style={{ display: "block", opacity: 0.7 }}>
            One name/email row appears per golfer below — rows follow the
            quantity above.
          </small>
        </div>
        <div className={styles.rows}>
          {golfers.map((golfer, i) => (
            <div key={i} className={styles.rows}>
              <div className={styles.field}>
                <label htmlFor={`golfer-name-${i}`}>Golfer {i + 1} name</label>
                <input
                  id={`golfer-name-${i}`}
                  value={golfer.name}
                  onChange={(e) => setGolfer(i, "name", e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor={`golfer-email-${i}`}>
                  Golfer {i + 1} email
                </label>
                <input
                  id={`golfer-email-${i}`}
                  type="email"
                  value={golfer.email}
                  onChange={(e) => setGolfer(i, "email", e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
        <button
          className={styles.primary}
          onClick={() => {
            setFlow("golf")
            void buildCart("golf")
          }}
          disabled={building}
        >
          Build cart (golf outing)
        </button>
      </section>

      {error && <div className={styles.error}>{error}</div>}

      {cart && (
        <section className={styles.card}>
          <h2>Server-computed cart</h2>
          <p>
            Amounts are authoritative from the server catalog — the client never
            dictated them.
          </p>
          <table className={styles.state}>
            <thead>
              <tr>
                <th>Line item</th>
                <th>Unit</th>
                <th>Qty</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {cart.items.map((item) => (
                <tr key={item.label}>
                  <td>{item.label}</td>
                  <td>${(item.unitAmount / 100).toFixed(2)}</td>
                  <td>{item.quantity}</td>
                  <td>
                    ${((item.unitAmount * item.quantity) / 100).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.total}>
            <span>Total</span>
            <span>${(cart.total / 100).toFixed(2)}</span>
          </div>
          {cart.golfers && (
            <>
              <h3>Registered golfers</h3>
              <table className={styles.state}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.golfers.map((golfer, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{golfer.name || "—"}</td>
                      <td>{golfer.email || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          <p style={{ marginTop: 16 }}>
            <button
              className={styles.primary}
              onClick={() =>
                router.push(`/prototype/checkout?cartRef=${cart.cartRef}`)
              }
            >
              Pay with Stripe →
            </button>
          </p>
        </section>
      )}
    </>
  )
}
