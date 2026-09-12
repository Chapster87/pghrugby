import { useState } from "react"
import clsx from "clsx"

import Button from "@components/button"
import QuantitySelector from "@components/quantity-selector"
import Select from "@components/select"

import { money, type PdpField, type PdpLine, type PdpPhoto } from "./data"
import s from "./style.module.css"

/**
 * PROTOTYPE — a page-owned gallery item. A tinted placeholder stands in for the
 * Cloudinary `desktop_media` / `mobile_media` pair; only its placement and
 * behaviour matter for the layout question.
 *
 * @param props.photo - The photo to stand in for.
 * @param props.tone - 0–3, cycles the placeholder tint.
 * @param props.className - Layout class from the hosting layout.
 */
export function Photo({
  photo,
  tone = 0,
  className,
}: {
  photo: PdpPhoto
  tone?: number
  className?: string
}) {
  return (
    <div
      role="img"
      aria-label={photo.alt}
      className={clsx(s.photo, s[`tone${tone % 4}`], className)}
    >
      <span className={s.photoLabel}>{photo.alt}</span>
    </div>
  )
}

/**
 * The line's effective price, with the regular price struck through when a sale
 * is active (mirrors the resolved sale price in #72).
 */
export function LinePrice({
  line,
  className,
}: {
  line: PdpLine
  className?: string
}) {
  return (
    <span className={clsx(s.price, className)}>
      {line.compareAtAmount !== undefined && (
        <span className={s.compareAt}>{money(line.compareAtAmount)}</span>
      )}
      <span className={s.amount}>{money(line.unitAmount)}</span>
    </span>
  )
}

/** A sold-out marker. Sold-out lines render disabled and labelled, never hidden. */
export function SoldOutBadge() {
  return <span className={s.soldOut}>Sold out</span>
}

/**
 * A compact quantity stepper, shown only on quantity-bearing lines.
 *
 * @param props.qty - Current quantity.
 * @param props.setQty - Setter for the quantity.
 */
export function QuantityStepper({
  qty,
  setQty,
  className,
}: {
  qty: number
  setQty: (qty: number) => void
  className?: string
}) {
  return (
    <div className={clsx(s.stepper, className)}>
      <QuantitySelector quantity={qty} setQuantity={setQty} />
    </div>
  )
}

/**
 * The DataCollector fields. Rendered in the buy box, above the add-to-cart.
 */
export function FieldInputs({
  fields,
  values,
  setValue,
  repeatables,
  setRepeatableRow,
  addRepeatableRow,
  removeRepeatableRow,
  idPrefix,
}: {
  fields: PdpField[]
  values: Record<string, string>
  setValue: (name: string, value: string) => void
  repeatables: Record<string, string[]>
  setRepeatableRow: (name: string, index: number, value: string) => void
  addRepeatableRow: (name: string, max?: number) => void
  removeRepeatableRow: (name: string, index: number) => void
  idPrefix: string
}) {
  return (
    <div className={s.fields}>
      {fields.map((field) => {
        if (field.repeatable) {
          const rows = repeatables[field.name] ?? [""]
          return (
            <div key={field.name} className={s.field}>
              <span className={s.fieldLabel}>
                {field.label}
                {field.required && <span className={s.required}> *</span>}
              </span>
              {rows.map((row, index) => (
                <div key={index} className={s.repeatRow}>
                  <input
                    className={s.input}
                    type="text"
                    value={row}
                    placeholder={field.placeholder ?? `${field.label} ${index + 1}`}
                    onChange={(event) =>
                      setRepeatableRow(field.name, index, event.target.value)
                    }
                  />
                  {rows.length > 1 && (
                    <button
                      type="button"
                      className={s.rowAction}
                      onClick={() => removeRepeatableRow(field.name, index)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              {(!field.max || rows.length < field.max) && (
                <Button
                  type="button"
                  variant="primary"
                  size="small"
                  className={s.addRow}
                  onClick={() => addRepeatableRow(field.name, field.max)}
                >
                  + Add {field.label.toLowerCase()}
                </Button>
              )}
            </div>
          )
        }

        const inputId = `${idPrefix}-${field.name}`

        return (
          <div key={field.name} className={s.field}>
            <label className={s.fieldLabel} htmlFor={inputId}>
              {field.label}
              {field.required && <span className={s.required}> *</span>}
            </label>
            {field.type === "select" ? (
              <Select.Root
                value={values[field.name] ?? ""}
                onValueChange={(value) => setValue(field.name, value)}
              >
                <Select.Trigger id={inputId}>
                  <Select.Value placeholder={field.placeholder ?? "Select…"} />
                  <Select.Icon />
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content>
                    <Select.Viewport>
                      {(field.options ?? []).map((option) => (
                        <Select.Item key={option} value={option}>
                          <Select.ItemIndicator />
                          <Select.ItemText>{option}</Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            ) : (
              <input
                id={inputId}
                className={s.input}
                type={field.type === "email" ? "email" : "text"}
                value={values[field.name] ?? ""}
                placeholder={field.placeholder}
                onChange={(event) => setValue(field.name, event.target.value)}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * The option selector for a multi-primary page (`product_type: variation`): a
 * dropdown with no preselection, sold-out options disabled and labelled
 * (control semantics settled in #69).
 */
export function PrimarySelect({
  primaries,
  value,
  onChange,
  label,
  idPrefix,
  className,
}: {
  primaries: PdpLine[]
  value: string
  onChange: (id: string) => void
  label: string
  idPrefix: string
  className?: string
}) {
  const id = `${idPrefix}-primary`
  return (
    <div className={className}>
      <label className={s.fieldLabel} htmlFor={id}>
        {label}
      </label>
      <Select.Root value={value || undefined} onValueChange={onChange}>
        <Select.Trigger id={id}>
          <Select.Value placeholder="Choose an option" />
          <Select.Icon />
        </Select.Trigger>
        <Select.Portal>
          <Select.Content>
            <Select.Viewport>
              {primaries.map((line) => (
                <Select.Item
                  key={line.id}
                  value={line.id}
                  disabled={!line.inStock}
                >
                  <Select.ItemIndicator />
                  <Select.ItemText>
                    {line.label} — {money(line.unitAmount)}
                    {line.inStock ? "" : " (sold out)"}
                  </Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  )
}

/**
 * The option line for a single-primary page (`product_type: simple`): no
 * control, just the line, its price, and a stepper when it is quantity-bearing.
 */
export function SinglePrimaryLine({
  line,
  qty,
  setQty,
}: {
  line: PdpLine
  qty: number
  setQty: (qty: number) => void
}) {
  return (
    <div className={clsx(s.singlePrimary, !line.inStock && s.lineDisabled)}>
      <div className={s.lineText}>
        <span className={s.lineName}>{line.label}</span>
        {line.note && <span className={s.lineNote}>{line.note}</span>}
      </div>
      <div className={s.lineEnd}>
        {line.inStock ? <LinePrice line={line} /> : <SoldOutBadge />}
        {line.inStock && line.quantityBearing && (
          <QuantityStepper qty={qty} setQty={setQty} />
        )}
      </div>
    </div>
  )
}

/**
 * The add-to-cart action. Read-only: it never touches the cart API, it just
 * shows what the real call would carry.
 */
export function AddToCartButton({
  disabled,
  lineCount,
  label = "Add to cart",
  size = "default",
  className,
}: {
  disabled?: boolean
  lineCount: number
  label?: string
  size?: "small" | "default" | "large"
  className?: string
}) {
  const [stub, setStub] = useState(false)

  return (
    <div className={clsx(s.addToCart, className)}>
      <Button
        size={size}
        disabled={disabled}
        onClick={() => setStub(true)}
        className={s.addButton}
      >
        {label}
      </Button>
      {stub && (
        <p className={s.stub}>
          Stub — would POST {lineCount} line{lineCount === 1 ? "" : "s"} to
          /api/checkout/cart.
        </p>
      )}
    </div>
  )
}
