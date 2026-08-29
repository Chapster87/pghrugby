"use client"

import { useState } from "react"

import Button from "@/components/button"
import type { CheckoutCart } from "@/lib/checkout/cart-store"
import { useRouter } from "next/navigation"

import s from "./styles.module.css"

export type PdpOption = {
  sku: string
  label: string
  /** Minor units (cents) — display only; the server re-validates at build time. */
  unitAmount: number
}

export type PdpProduct = {
  title: string
  sku: string
  shortDescription: string | null
  longDescription: string | null
  kind: "primary" | "addon"
  options: PdpOption[]
}

export type PdpField = {
  label: string
  fieldName: string
  fieldType: string
  required: boolean
  options: string | null
  placeholder: string | null
  repeatable: boolean
  max: number | null
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`

/**
 * PDP checkout form — the interactive half of a Product Detail Page.
 *
 * Renders the PDP's curated composition: primary options (pick one across the
 * primaries), add-ons (optional), and the DataCollector form fields
 * (repeatable fields expand to N rows, which also drives the primary line's
 * quantity — e.g. golfers per registration). Selections are posted to the
 * server-authoritative cart API; amounts displayed here are estimates only.
 */
export default function PdpCheckoutForm({
  pdp,
  products,
  fields,
}: {
  pdp: string
  products: PdpProduct[]
  fields: PdpField[]
}) {
  const router = useRouter()

  const primaries = products.filter((p) => p.kind === "primary")
  const addons = products.filter((p) => p.kind === "addon")

  const allPrimaryOptions = primaries.flatMap((p) => p.options)
  const [primarySku, setPrimarySku] = useState<string>(
    allPrimaryOptions[0]?.sku ?? ""
  )
  const [addonSkus, setAddonSkus] = useState<string[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [repeatables, setRepeatables] = useState<Record<string, string[]>>(
    Object.fromEntries(
      fields.filter((f) => f.repeatable).map((f) => [f.fieldName, [""]])
    )
  )

  const [cart, setCart] = useState<CheckoutCart | null>(null)
  const [building, setBuilding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const repeatableField = fields.find((f) => f.repeatable) ?? null
  const quantity = repeatableField
    ? Math.max(1, repeatables[repeatableField.fieldName]?.length ?? 1)
    : 1

  const selectedPrimary = allPrimaryOptions.find((o) => o.sku === primarySku)

  const toggleAddon = (sku: string) => {
    setAddonSkus((prev) =>
      prev.includes(sku) ? prev.filter((k) => k !== sku) : [...prev, sku]
    )
  }

  const setRepeatableRow = (fieldName: string, index: number, value: string) => {
    setRepeatables((prev) => {
      const rows = [...(prev[fieldName] ?? [""])]
      rows[index] = value
      return { ...prev, [fieldName]: rows }
    })
  }

  const addRepeatableRow = (field: PdpField) => {
    setRepeatables((prev) => {
      const rows = [...(prev[field.fieldName] ?? [""])]
      if (field.max && rows.length >= field.max) return prev
      rows.push("")
      return { ...prev, [field.fieldName]: rows }
    })
  }

  const removeRepeatableRow = (field: PdpField, index: number) => {
    setRepeatables((prev) => {
      const rows = [...(prev[field.fieldName] ?? [""])]
      if (rows.length <= 1) return prev
      rows.splice(index, 1)
      return { ...prev, [field.fieldName]: rows }
    })
  }

  const buildCart = async () => {
    setBuilding(true)
    setError(null)
    try {
      // Required-field check (client-side convenience; the server validates skus).
      for (const field of fields) {
        if (!field.required) continue
        if (field.repeatable) {
          const rows = (repeatables[field.fieldName] ?? []).filter(
            (v) => v.trim() !== ""
          )
          if (rows.length === 0) {
            setError(`Please add at least one ${field.label.toLowerCase()}`)
            setBuilding(false)
            return
          }
        } else if (!(values[field.fieldName] ?? "").trim()) {
          setError(`Please fill in ${field.label.toLowerCase()}`)
          setBuilding(false)
          return
        }
      }

      const selections = [{ sku: primarySku, quantity }]
      for (const sku of addonSkus) selections.push({ sku, quantity: 1 })

      const registration: Record<string, unknown> = {}
      for (const field of fields) {
        if (field.repeatable) {
          registration[field.fieldName] = (
            repeatables[field.fieldName] ?? []
          ).filter((v) => v.trim() !== "")
        } else {
          const value = (values[field.fieldName] ?? "").trim()
          if (value) registration[field.fieldName] = value
        }
      }

      const res = await fetch("/api/checkout/cart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pdp,
          selections,
          registration:
            Object.keys(registration).length > 0 ? registration : undefined,
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

  const estimate =
    (selectedPrimary ? selectedPrimary.unitAmount * quantity : 0) +
    addonSkus.reduce((sum, sku) => {
      const option = addons
        .flatMap((a) => a.options)
        .find((o) => o.sku === sku)
      return sum + (option?.unitAmount ?? 0)
    }, 0)

  return (
    <div className={s.formWrap}>
      {primaries.length > 0 && (
        <fieldset className={s.optionGroup}>
          <legend className={s.groupLabel}>
            {primaries.length === 1 ? primaries[0].title : "Choose an option"}
          </legend>
          {primaries.map((product) =>
            product.options.map((option) => (
              <label key={option.sku} className={s.optionRow}>
                <input
                  type="radio"
                  name="primary"
                  value={option.sku}
                  checked={primarySku === option.sku}
                  onChange={() => setPrimarySku(option.sku)}
                />
                <span className={s.optionText}>
                  <span className={s.optionLabel}>{option.label}</span>
                  <span className={s.optionPrice}>{money(option.unitAmount)}</span>
                </span>
              </label>
            ))
          )}
        </fieldset>
      )}

      {addons.length > 0 && (
        <fieldset className={s.optionGroup}>
          <legend className={s.groupLabel}>Add-ons</legend>
          {addons.map((product) =>
            product.options.map((option) => (
              <label key={option.sku} className={s.optionRow}>
                <input
                  type="checkbox"
                  checked={addonSkus.includes(option.sku)}
                  onChange={() => toggleAddon(option.sku)}
                />
                <span className={s.optionText}>
                  <span className={s.optionLabel}>{option.label}</span>
                  <span className={s.optionPrice}>{money(option.unitAmount)}</span>
                </span>
              </label>
            ))
          )}
        </fieldset>
      )}

      {fields.length > 0 && (
        <div className={s.formSection}>
          {fields.map((field) => {
            if (field.repeatable) {
              const rows = repeatables[field.fieldName] ?? [""]
              return (
                <div key={field.fieldName} className={s.field}>
                  <span className={s.fieldLabel}>
                    {field.label}
                    {field.required && <span className={s.required}> *</span>}
                  </span>
                  {rows.map((row, i) => (
                    <div key={i} className={s.repeatRow}>
                      <input
                        className={s.input}
                        type={field.fieldType === "email" ? "email" : "text"}
                        value={row}
                        placeholder={
                          field.placeholder ||
                          `${field.label} ${i + 1}`
                        }
                        onChange={(e) =>
                          setRepeatableRow(field.fieldName, i, e.target.value)
                        }
                      />
                      {rows.length > 1 && (
                        <button
                          type="button"
                          className={s.rowAction}
                          onClick={() => removeRepeatableRow(field, i)}
                          aria-label={`Remove ${field.label.toLowerCase()} ${i + 1}`}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  {(!field.max || rows.length < field.max) && (
                    <button
                      type="button"
                      className={s.addRow}
                      onClick={() => addRepeatableRow(field)}
                    >
                      + Add {field.label.toLowerCase()}
                    </button>
                  )}
                </div>
              )
            }

            return (
              <div key={field.fieldName} className={s.field}>
                <label className={s.fieldLabel} htmlFor={field.fieldName}>
                  {field.label}
                  {field.required && <span className={s.required}> *</span>}
                </label>
                {field.fieldType === "select" ? (
                  <select
                    id={field.fieldName}
                    className={s.select}
                    value={values[field.fieldName] ?? ""}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        [field.fieldName]: e.target.value,
                      }))
                    }
                  >
                    <option value="">Select…</option>
                    {(field.options ?? "")
                      .split("\n")
                      .map((o) => o.trim())
                      .filter(Boolean)
                      .map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                  </select>
                ) : field.fieldType === "textarea" ? (
                  <textarea
                    id={field.fieldName}
                    className={s.textarea}
                    value={values[field.fieldName] ?? ""}
                    placeholder={field.placeholder ?? undefined}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        [field.fieldName]: e.target.value,
                      }))
                    }
                  />
                ) : (
                  <input
                    id={field.fieldName}
                    className={s.input}
                    type={field.fieldType === "email" ? "email" : "text"}
                    value={values[field.fieldName] ?? ""}
                    placeholder={field.placeholder ?? undefined}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        [field.fieldName]: e.target.value,
                      }))
                    }
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className={s.estimate}>
        <span>Estimated total</span>
        <span>{money(estimate)}</span>
      </div>

      <Button
        onClick={buildCart}
        disabled={building || !primarySku}
        data-testid="build-pdp-cart"
      >
        {building ? "Building…" : "Continue to checkout"}
      </Button>

      {error && <div className={s.error}>{error}</div>}

      {cart && (
        <div className={s.summary}>
          <h3 className={s.summaryTitle}>Order summary</h3>
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
                  {money(item.unitAmount * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className={s.total}>
            <span>Total</span>
            <span>{money(cart.total)}</span>
          </div>
          <Button
            onClick={toCheckout}
            size="large"
            className={s.payButton}
            data-testid="pay-with-stripe"
          >
            Pay with Stripe →
          </Button>
        </div>
      )}
    </div>
  )
}
