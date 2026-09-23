"use client"

import clsx from "clsx"

import Button from "@components/button"
import Select from "@components/select"

import type { CollectorField } from "@/lib/checkout/cart-entries"
import type { CollectorAnswers, CollectorErrors } from "./use-collector-form"

import s from "./style.module.css"

/**
 * The DataCollector fields, rendered from the collector's field definitions.
 *
 * Purely presentational and controlled: the PDP renders it under its buy box at
 * add-time, and the flyout's edit panel renders the same component over the
 * entry's snapshotted fields, so the buyer always edits the form they filled
 * (`docs/agents/registration-editing.md` § 7).
 *
 * A repeatable field renders one row per answer, an empty trailing row allowed;
 * its "+ Add" control is disabled at the field's `max`.
 */

export default function CollectorFields({
  fields,
  values,
  errors,
  rowsFor,
  onChange,
  onSetRow,
  onAddRow,
  onRemoveRow,
  idPrefix,
  className,
}: {
  fields: CollectorField[]
  values: CollectorAnswers
  errors?: CollectorErrors
  /** The rows currently held for a repeatable field, in order. */
  rowsFor: (name: string) => string[]
  onChange: (name: string, value: string) => void
  onSetRow: (name: string, index: number, value: string) => void
  onAddRow: (field: CollectorField) => void
  onRemoveRow: (field: CollectorField, index: number) => void
  /** Namespaces the input ids, so two forms on one page never collide. */
  idPrefix: string
  className?: string
}) {
  return (
    <div className={clsx(s.fields, className)}>
      {fields.map((field) => {
        const error = errors?.[field.name]
        const inputId = `${idPrefix}-${field.name}`

        if (field.repeatable) {
          const rows = rowsFor(field.name)
          const atMax = Boolean(field.max && rows.length >= field.max)
          return (
            <div key={field.name} className={s.field}>
              <span className={s.fieldLabel}>
                {field.label}
                {field.required && <span className={s.required}> *</span>}
              </span>
              {rows.map((row, index) => (
                <div key={index} className={s.repeatRow}>
                  <input
                    className={clsx(s.input, error && s.inputError)}
                    type={field.type === "email" ? "email" : "text"}
                    value={row}
                    aria-label={`${field.label} ${index + 1}`}
                    placeholder={field.placeholder ?? `${field.label} ${index + 1}`}
                    onChange={(event) =>
                      onSetRow(field.name, index, event.target.value)
                    }
                  />
                  {rows.length > 1 && (
                    <button
                      type="button"
                      className={s.rowAction}
                      onClick={() => onRemoveRow(field, index)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              {!atMax && (
                <Button
                  type="button"
                  variant="primary"
                  size="small"
                  className={s.addRow}
                  onClick={() => onAddRow(field)}
                >
                  + Add {field.label.toLowerCase()}
                </Button>
              )}
              {error && <p className={s.fieldError}>{error}</p>}
            </div>
          )
        }

        return (
          <div key={field.name} className={s.field}>
            <label className={s.fieldLabel} htmlFor={inputId}>
              {field.label}
              {field.required && <span className={s.required}> *</span>}
            </label>
            {field.type === "select" ? (
              <Select.Root
                value={String(values[field.name] ?? "") || undefined}
                onValueChange={(value) => onChange(field.name, value)}
              >
                <Select.Trigger id={inputId} aria-label={field.label}>
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
            ) : field.type === "textarea" ? (
              <textarea
                id={inputId}
                className={clsx(s.textarea, error && s.inputError)}
                value={String(values[field.name] ?? "")}
                placeholder={field.placeholder ?? undefined}
                onChange={(event) => onChange(field.name, event.target.value)}
              />
            ) : (
              <input
                id={inputId}
                className={clsx(s.input, error && s.inputError)}
                type={field.type === "email" ? "email" : "text"}
                value={String(values[field.name] ?? "")}
                placeholder={field.placeholder ?? undefined}
                aria-invalid={error ? true : undefined}
                onChange={(event) => onChange(field.name, event.target.value)}
              />
            )}
            {error && <p className={s.fieldError}>{error}</p>}
          </div>
        )
      })}
    </div>
  )
}
