"use client"

import { useState, type RefObject } from "react"
import clsx from "clsx"
import { ChevronLeft } from "lucide-react"

import Button from "@components/button"
import Select from "@components/select"

import {
  type CartField,
  type CollectorEntry,
  type PricedLine,
} from "./data"
import { Stepper } from "./parts"
import s from "./style.module.css"

type Answers = Record<string, string | string[]>

/**
 * PROTOTYPE — the flyout's `view: edit` panel, from
 * `docs/agents/registration-editing.md` § 5: the flyout Dialog swaps its own
 * content to the collector form rather than nesting a second Dialog. One focus
 * scope, one dismiss contract.
 *
 * Save writes the answers and the primary line's quantity together (they must
 * never diverge); Cancel discards. Increasing quantity appends empty player
 * rows, decreasing drops trailing rows and warns before discarding a name.
 *
 * @param props.collector - The collector entry being edited.
 * @param props.primary - The registration's priced line (owns quantity).
 * @param props.firstFieldRef - Focused on mount by the hosting flyout.
 * @param props.onSave - Commits answers + quantity.
 * @param props.onCancel - Returns to the cart list without mutating.
 */
export default function EditPanel({
  collector,
  primary,
  firstFieldRef,
  onSave,
  onCancel,
}: {
  collector: CollectorEntry
  primary: PricedLine
  firstFieldRef: RefObject<HTMLInputElement | null>
  onSave: (answers: Answers, quantity: number) => void
  onCancel: () => void
}) {
  const maxQuantity = collector.maxQuantity ?? 4
  const repeatableField = collector.fields.find((field) => field.repeatable)
  const rowsKey = repeatableField?.name ?? "rows"

  const [answers, setAnswers] = useState<Answers>(() => {
    const next: Answers = {}
    for (const field of collector.fields) {
      const raw = collector.answers[field.name]
      next[field.name] = Array.isArray(raw) ? [...raw] : (raw ?? "")
    }
    return next
  })
  const [quantity, setQuantity] = useState(primary.quantity)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pendingDrop, setPendingDrop] = useState<{
    quantity: number
    names: string[]
  } | null>(null)

  const rows = (): string[] => {
    const raw = answers[rowsKey]
    return Array.isArray(raw) ? raw : []
  }

  const setRows = (next: string[]) =>
    setAnswers((prev) => ({ ...prev, [rowsKey]: next }))

  const setValue = (name: string, value: string) =>
    setAnswers((prev) => ({ ...prev, [name]: value }))

  const commitQuantity = (next: number) => {
    const target = Math.min(maxQuantity, Math.max(1, next))
    const current = rows()
    const targetRows = target - 1
    setQuantity(target)
    if (targetRows === current.length) return
    if (targetRows < current.length) {
      setRows(current.slice(0, targetRows))
    } else {
      const grown = [...current]
      while (grown.length < targetRows) grown.push("")
      setRows(grown)
    }
  }

  const requestQuantity = (next: number) => {
    const target = Math.min(maxQuantity, Math.max(1, next))
    const current = rows()
    const targetRows = target - 1
    if (targetRows < current.length) {
      const dropped = current.slice(targetRows).filter((name) => name.trim())
      if (dropped.length > 0) {
        setPendingDrop({ quantity: target, names: dropped })
        return
      }
    }
    commitQuantity(target)
  }

  const addRow = () => {
    const max = repeatableField?.max ?? maxQuantity - 1
    if (rows().length >= max) return
    setRows([...rows(), ""])
  }

  const removeRow = (index: number) =>
    setRows(rows().filter((_, i) => i !== index))

  const firstInputName = collector.fields.find(
    (field) => !field.repeatable && field.type !== "select"
  )?.name

  const submit = () => {
    const nextErrors: Record<string, string> = {}
    for (const field of collector.fields) {
      if (!field.required) continue
      const raw = answers[field.name]
      const filled = Array.isArray(raw)
        ? raw.some((value) => value.trim())
        : String(raw ?? "").trim().length > 0
      if (!filled) nextErrors[field.name] = `${field.label} is required`
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }
    onSave(answers, quantity)
  }

  return (
    <div className={s.editPanel}>
      <header className={s.editHead}>
        <button type="button" className={s.back} onClick={onCancel}>
          <ChevronLeft size={18} aria-hidden />
          Back to cart
        </button>
        <span className={s.editTitle}>{collector.label}</span>
      </header>

      <div className={s.editBody}>
        <div className={s.editQty}>
          <span className={s.fieldLabel}>Registrations</span>
          <Stepper
            line={primary}
            setQuantity={requestQuantity}
            index={99}
          />
          <span className={s.editHint}>
            1–{maxQuantity} · quantity drives the player rows
          </span>
        </div>

        {pendingDrop && (
          <div className={s.warning} role="alert">
            <p className={s.warningText}>
              Reducing to {pendingDrop.quantity}{" "}
              {pendingDrop.quantity === 1 ? "player" : "players"} discards{" "}
              {pendingDrop.names.join(", ")}. The paid registration drops with it.
            </p>
            <div className={s.warningActions}>
              <Button
                size="small"
                onClick={() => {
                  commitQuantity(pendingDrop.quantity)
                  setPendingDrop(null)
                }}
              >
                Reduce anyway
              </Button>
              <Button
                size="small"
                variant="secondary"
                onClick={() => setPendingDrop(null)}
              >
                Keep {pendingDrop.names.length}
              </Button>
            </div>
          </div>
        )}

        {collector.fields.map((field) => (
          <Field
            key={field.name}
            field={field}
            value={answers[field.name]}
            rows={field.name === rowsKey ? rows() : []}
            error={errors[field.name]}
            maxRows={repeatableField?.max}
            firstInputRef={
              field.name === firstInputName ? firstFieldRef : undefined
            }
            onChange={(value) => setValue(field.name, value)}
            onRowChange={(index, value) => {
              const next = [...rows()]
              next[index] = value
              setRows(next)
            }}
            onAddRow={addRow}
            onRemoveRow={removeRow}
          />
        ))}
      </div>

      <footer className={s.editFoot}>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={submit}>Save registration</Button>
      </footer>
    </div>
  )
}

/** One snapshotted collector field, rendered as the buyer originally filled it. */
function Field({
  field,
  value,
  rows,
  error,
  maxRows,
  firstInputRef,
  onChange,
  onRowChange,
  onAddRow,
  onRemoveRow,
}: {
  field: CartField
  value: string | string[] | undefined
  rows: string[]
  error?: string
  maxRows?: number
  firstInputRef?: RefObject<HTMLInputElement | null>
  onChange: (value: string) => void
  onRowChange: (index: number, value: string) => void
  onAddRow: () => void
  onRemoveRow: (index: number) => void
}) {
  if (field.repeatable) {
    return (
      <div className={s.field}>
        <span className={s.fieldLabel}>{field.label}</span>
        {rows.map((row, index) => (
          <div key={index} className={s.repeatRow}>
            <input
              className={s.input}
              type="text"
              value={row}
              placeholder={
                index === 0 && field.placeholder
                  ? `${field.placeholder} (player ${index + 2})`
                  : `${field.label} ${index + 2}`
              }
              onChange={(event) => onRowChange(index, event.target.value)}
            />
            <button
              type="button"
              className={s.rowAction}
              onClick={() => onRemoveRow(index)}
            >
              Remove
            </button>
          </div>
        ))}
        {(!maxRows || rows.length < maxRows) && (
          <Button
            type="button"
            variant="primary"
            size="small"
            className={s.addRow}
            onClick={onAddRow}
          >
            + Add {field.label.toLowerCase()}
          </Button>
        )}
      </div>
    )
  }

  const inputId = `edit-${field.name}`
  const stringValue = Array.isArray(value) ? "" : (value ?? "")

  return (
    <div className={s.field}>
      <label className={s.fieldLabel} htmlFor={inputId}>
        {field.label}
        {field.required && <span className={s.required}> *</span>}
      </label>
      {field.type === "select" ? (
        <Select.Root
          value={stringValue}
          onValueChange={onChange}
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
          ref={firstInputRef}
          id={inputId}
          className={clsx(s.input, error && s.inputError)}
          type={field.type === "email" ? "email" : "text"}
          value={stringValue}
          placeholder={field.placeholder}
          aria-invalid={error ? true : undefined}
          onChange={(event) => {
            onChange(event.target.value)
          }}
        />
      )}
      {error && <span className={s.fieldError}>{error}</span>}
    </div>
  )
}
