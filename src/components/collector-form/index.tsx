"use client"

import clsx from "clsx"

import Button from "@components/button"
import Checkbox from "@components/checkbox"
import Radio from "@components/radio"
import Select from "@components/select"

import {
  isRepeatableField,
  type CollectorField,
  type FreeInputCollectorField,
} from "@/lib/checkout/cart-entries"
import type { CollectorAnswers, CollectorErrors } from "./use-collector-form"

import s from "./style.module.css"

/**
 * The marker a ticked `checkbox` field stores. Every value in this form is a
 * string (`CollectorAnswers`), so the boolean is spelled: any non-empty value
 * passes the required check, and `""` is unticked.
 */
const CHECKED = "true"

/**
 * One value of a free-input field: a textarea for `textarea`, and a text or email
 * input otherwise.
 *
 * Shared by the single-value render and the repeatable rows, so a repeated email
 * is still an email input and a repeated `textarea` is still multi-line — the
 * repeat branch used to collapse every type to a single-line text box.
 */
function FreeInput({
  field,
  id,
  value,
  placeholder,
  error,
  ariaLabel,
  onChange,
}: {
  field: FreeInputCollectorField
  /** Omitted on a repeat row, which is labelled by `aria-label` instead. */
  id?: string
  value: string
  placeholder?: string
  error?: string
  ariaLabel?: string
  onChange: (value: string) => void
}) {
  if (field.type === "textarea") {
    return (
      <textarea
        id={id}
        className={clsx(s.textarea, error && s.inputError)}
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }

  return (
    <input
      id={id}
      className={clsx(s.input, error && s.inputError)}
      type={field.type === "email" ? "email" : "text"}
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel}
      aria-invalid={error ? true : undefined}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

/**
 * The DataCollector fields, rendered from the collector's field definitions.
 *
 * Purely presentational and controlled: the PDP renders it under its buy box at
 * add-time, and the flyout's edit panel renders the same component over the
 * entry's snapshotted fields, so the buyer always edits the form they filled
 * (`docs/agents/registration-editing.md` § 7).
 *
 * The field's `type` picks the control, and the union it is read from is the
 * DatoCMS block set, so every case here has a block behind it and there is no
 * unrecognised value to fall back from: a `select` and a `radio` choose one of
 * their `options`, a `checkbox` is a single boolean tick, a `textarea` is
 * multi-line, and `text` / `email` are single-line.
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
  onAddRow: (field: FreeInputCollectorField) => void
  onRemoveRow: (field: FreeInputCollectorField, index: number) => void
  /** Namespaces the input ids, so two forms on one page never collide. */
  idPrefix: string
  className?: string
}) {
  return (
    <div className={clsx(s.fields, className)}>
      {fields.map((field) => {
        const error = errors?.[field.name]
        const inputId = `${idPrefix}-${field.name}`

        if (isRepeatableField(field)) {
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
                  <FreeInput
                    field={field}
                    value={row}
                    error={error}
                    ariaLabel={`${field.label} ${index + 1}`}
                    placeholder={
                      field.placeholder ?? `${field.label} ${index + 1}`
                    }
                    onChange={(value) => onSetRow(field.name, index, value)}
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

        if (field.type === "checkbox") {
          return (
            <div key={field.name} className={s.field}>
              <Checkbox.Label>
                <Checkbox.Root
                  id={inputId}
                  checked={String(values[field.name] ?? "") === CHECKED}
                  onCheckedChange={(checked) =>
                    onChange(field.name, checked === true ? CHECKED : "")
                  }
                  aria-invalid={error ? true : undefined}
                >
                  <Checkbox.Indicator />
                </Checkbox.Root>
                <span className={s.checkboxLabel}>
                  {field.label}
                  {field.required && <span className={s.required}> *</span>}
                </span>
              </Checkbox.Label>
              {error && <p className={s.fieldError}>{error}</p>}
            </div>
          )
        }

        if (field.type === "radio") {
          const labelId = `${inputId}-label`
          return (
            <div key={field.name} className={s.field}>
              <span id={labelId} className={s.fieldLabel}>
                {field.label}
                {field.required && <span className={s.required}> *</span>}
              </span>
              <Radio.Root
                value={String(values[field.name] ?? "") || undefined}
                onValueChange={(value) => onChange(field.name, value)}
                aria-labelledby={labelId}
                aria-invalid={error ? true : undefined}
              >
                {(field.options ?? []).map((option) => (
                  <Radio.Label key={option}>
                    <Radio.Item value={option}>
                      <Radio.Indicator />
                    </Radio.Item>
                    {option}
                  </Radio.Label>
                ))}
              </Radio.Root>
              {error && <p className={s.fieldError}>{error}</p>}
            </div>
          )
        }

        if (field.type === "select") {
          return (
            <div key={field.name} className={s.field}>
              <label className={s.fieldLabel} htmlFor={inputId}>
                {field.label}
                {field.required && <span className={s.required}> *</span>}
              </label>
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
              {error && <p className={s.fieldError}>{error}</p>}
            </div>
          )
        }

        // The free-input family: `text`, `textarea` and `email`, single-valued.
        return (
          <div key={field.name} className={s.field}>
            <label className={s.fieldLabel} htmlFor={inputId}>
              {field.label}
              {field.required && <span className={s.required}> *</span>}
            </label>
            <FreeInput
              field={field}
              id={inputId}
              value={String(values[field.name] ?? "")}
              placeholder={field.placeholder ?? undefined}
              error={error}
              onChange={(value) => onChange(field.name, value)}
            />
            {error && <p className={s.fieldError}>{error}</p>}
          </div>
        )
      })}
    </div>
  )
}
