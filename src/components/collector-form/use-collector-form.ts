"use client"

import { useCallback, useState } from "react"

import type { CollectorField } from "@/lib/checkout/cart-entries"

import {
  applyQuantityChange,
  planQuantityChange,
  rowsOf,
  type CollectorAnswers,
} from "./rows"

/**
 * The DataCollector form's state — the field values and the validation rules.
 *
 * Shared by the PDP's add-time collector form and the flyout's edit panel, so
 * an add and a later edit enforce exactly the same rules
 * (`docs/agents/registration-editing.md` § 6: "same rules as add-time").
 *
 * Answers are keyed by field name, matching `CollectorEntry.answers`: a scalar
 * is a string, a repeatable is a string array.
 *
 * The `quantity → rows` rules are **not** here: they are plain functions in
 * `./rows.ts`, so the PDP, the edit panel, and the scripted round-trip share one
 * implementation. This hook owns the state and delegates to them.
 */

export type { CollectorAnswers }

/** Per-field validation messages, keyed by field name. */
export type CollectorErrors = Record<string, string>

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

  /**
   * Plans a quantity change against the repeatable rows without committing it,
   * so a caller can warn before discarding a named row.
   *
   * @param quantity - The requested registration quantity.
   * @returns The target row count and the named rows the change would drop.
   */
  const planQuantity = useCallback(
    (quantity: number) => planQuantityChange(fields, values, quantity),
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
      const plan = applyQuantityChange(fields, values, quantity)
      setValues(plan.values)
      return plan.dropped
    },
    [fields, values]
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
