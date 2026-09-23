"use client"

import { useCallback, useState } from "react"

import type { CollectorField } from "@/lib/checkout/cart-entries"

/**
 * The DataCollector form's state — the field values, the validation rules, and
 * the `quantity → rows` coupling.
 *
 * Shared by the PDP's add-time collector form and the flyout's edit panel, so
 * an add and a later edit enforce exactly the same rules
 * (`docs/agents/registration-editing.md` § 6: "same rules as add-time").
 *
 * Answers are keyed by field name, matching `CollectorEntry.answers`: a scalar
 * is a string, a repeatable is a string array.
 */

/** A DataCollector payload, keyed by field name. */
export type CollectorAnswers = Record<string, string | string[]>

/** Per-field validation messages, keyed by field name. */
export type CollectorErrors = Record<string, string>

/**
 * How many repeatable rows a registration of this quantity collects.
 *
 * `quantity → rows` (cart-line model § 4): the line's quantity **is** the
 * number of registrations. The collector's first person is captured by a
 * non-repeatable field (golf's captain is player 1), so the repeatable field
 * collects the remaining ones — `quantity - 1`, capped by the field's `max`.
 *
 * The floor of one row is deliberate and is the one place this departs from a
 * literal mirror: at `quantity === 1` the remaining count is zero, yet a
 * required repeatable field with no row at all could never be filled, and the
 * club's rule is that a people/quantity mismatch warns and never blocks. One
 * empty row is always allowed.
 *
 * @param quantity - The registration line's quantity.
 * @param max - The repeatable field's cap from its add-time snapshot.
 * @returns The row count to render.
 */
export function registrationRowCount(quantity: number, max?: number): number {
  const remaining = Math.max(1, Math.floor(quantity || 1) - 1)
  return max && max > 0 ? Math.min(remaining, max) : remaining
}

/** Seeds the form from a field snapshot and optional existing answers. */
function initialValues(
  fields: CollectorField[],
  initial?: Record<string, unknown>
): CollectorAnswers {
  const values: CollectorAnswers = {}
  for (const field of fields) {
    const raw = initial?.[field.name]
    if (field.repeatable) {
      values[field.name] = Array.isArray(raw) ? raw.map(String) : [""]
    } else {
      values[field.name] = Array.isArray(raw)
        ? raw[0] ?? ""
        : raw === undefined || raw === null
        ? ""
        : String(raw)
    }
  }
  return values
}

/** The repeatable rows currently held for a field. */
function rowsOf(values: CollectorAnswers, name: string): string[] {
  const raw = values[name]
  return Array.isArray(raw) ? raw : [""]
}

/**
 * Builds the DataCollector form state for a field snapshot.
 *
 * @param fields - The collector's field definitions (add-time snapshot on the
 *   edit path, the live DatoCMS fields at add-time).
 * @param initial - Existing answers to seed from, for an edit.
 * @returns The values, mutations, validation, and the answers payload.
 */
export function useCollectorForm(
  fields: CollectorField[],
  initial?: Record<string, unknown>
) {
  const [values, setValues] = useState<CollectorAnswers>(() =>
    initialValues(fields, initial)
  )
  const [errors, setErrors] = useState<CollectorErrors>({})

  const setValue = useCallback((name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }))
  }, [])

  const setRow = useCallback((name: string, index: number, value: string) => {
    setValues((prev) => {
      const rows = [...rowsOf(prev, name)]
      rows[index] = value
      return { ...prev, [name]: rows }
    })
  }, [])

  const addRow = useCallback((field: CollectorField) => {
    setValues((prev) => {
      const rows = [...rowsOf(prev, field.name)]
      if (field.max && rows.length >= field.max) return prev
      rows.push("")
      return { ...prev, [field.name]: rows }
    })
  }, [])

  const removeRow = useCallback((field: CollectorField, index: number) => {
    setValues((prev) => {
      const rows = [...rowsOf(prev, field.name)]
      if (rows.length <= 1) return prev
      rows.splice(index, 1)
      return { ...prev, [field.name]: rows }
    })
  }, [])

  /** Resizes every repeatable field to a target row count, keeping values. */
  const setRowCount = useCallback(
    (count: number) => {
      setValues((prev) => {
        const next = { ...prev }
        for (const field of fields) {
          if (!field.repeatable) continue
          const target = Math.max(1, count)
          const rows = [...rowsOf(prev, field.name)]
          while (rows.length < target) rows.push("")
          rows.length = target
          next[field.name] = rows
        }
        return next
      })
    },
    [fields]
  )

  /**
   * Plans a quantity change against the repeatable rows without committing it,
   * so a caller can warn before discarding a named row.
   *
   * @param quantity - The requested registration quantity.
   * @returns The target row count and the named rows the change would drop.
   */
  const planQuantity = useCallback(
    (quantity: number) => {
      const rowCounts = fields
        .filter((field) => field.repeatable)
        .map((field) => registrationRowCount(quantity, field.max))
      const target = Math.max(1, ...rowCounts)
      const dropped: string[] = []
      for (const field of fields) {
        if (!field.repeatable) continue
        const rows = rowsOf(values, field.name)
        dropped.push(
          ...rows.slice(target).filter((row) => row.trim().length > 0)
        )
      }
      return { rowCount: target, dropped }
    },
    [fields, values]
  )

  /**
   * Applies a quantity change, resizing the repeatable rows to mirror it.
   *
   * @param quantity - The requested registration quantity.
   * @returns The rows the resize dropped.
   */
  const applyQuantity = useCallback(
    (quantity: number) => {
      const { rowCount, dropped } = planQuantity(quantity)
      setRowCount(rowCount)
      return dropped
    },
    [planQuantity, setRowCount]
  )

  /**
   * Validates the required fields.
   *
   * @returns True when the form may commit; false when it set `errors`.
   */
  const validate = useCallback(() => {
    const next: CollectorErrors = {}
    for (const field of fields) {
      if (!field.required) continue
      if (field.repeatable) {
        const filled = rowsOf(values, field.name).some(
          (row) => row.trim().length > 0
        )
        if (!filled)
          next[field.name] = `Add at least one ${field.label.toLowerCase()}`
      } else if (!String(values[field.name] ?? "").trim()) {
        next[field.name] = `${field.label} is required`
      }
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }, [fields, values])

  /**
   * The answers payload to store on the entry: repeatable rows with their
   * blanks dropped, scalars included only when answered.
   *
   * @returns The collector payload.
   */
  const answers = useCallback((): CollectorAnswers => {
    const payload: CollectorAnswers = {}
    for (const field of fields) {
      if (field.repeatable) {
        payload[field.name] = rowsOf(values, field.name).filter(
          (row) => row.trim().length > 0
        )
      } else {
        const value = String(values[field.name] ?? "").trim()
        if (value) payload[field.name] = value
      }
    }
    return payload
  }, [fields, values])

  const rowsFor = useCallback((name: string) => rowsOf(values, name), [values])

  return {
    values,
    errors,
    setValue,
    setRow,
    addRow,
    removeRow,
    rowsFor,
    planQuantity,
    applyQuantity,
    validate,
    answers,
  }
}
