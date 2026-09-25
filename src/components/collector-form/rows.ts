/**
 * The DataCollector form's row rules — the `quantity → rows` coupling, as plain
 * functions.
 *
 * Kept free of React (no hook, no state) so the PDP's add-time form, the
 * flyout's edit panel, and the scripted round-trip share **one** implementation
 * of the rule the cart-line model fixes (`docs/agents/cart-line-model.md` § 4,
 * `docs/agents/registration-editing.md` § 6): a registration line's quantity
 * **is** its number of registrations, so the collector's repeatable rows mirror
 * it — growing and shrinking with it, keeping the values already typed.
 *
 * `use-collector-form.ts` owns the React state and calls these; nothing here
 * holds anything.
 */

import type { CollectorField } from "@/lib/checkout/cart-entries"

/** A DataCollector payload as the form holds it, keyed by field name. */
export type CollectorAnswers = Record<string, string | string[]>

/**
 * The rows a repeatable field always renders, however low the quantity. A
 * required repeatable field with no row at all could never be filled, and the
 * club's rule is that a people/quantity mismatch warns and never blocks.
 */
const MIN_ROWS = 1

/**
 * How many repeatable rows a registration of this quantity collects.
 *
 * `quantity → rows`: the collector's first person is captured by a
 * non-repeatable field (golf's captain is player 1), so the repeatable field
 * collects the remaining ones — `quantity - 1`, capped by the field's `max`.
 *
 * The floor of one row is deliberate and is the one place this departs from a
 * literal mirror: at `quantity === 1` the remaining count is zero, yet a
 * required repeatable field with no row at all could never be filled.
 *
 * @param quantity - The registration line's quantity.
 * @param max - The repeatable field's cap from its add-time snapshot.
 * @returns The row count to render.
 */
export function registrationRowCount(quantity: number, max?: number): number {
  const remaining = Math.max(MIN_ROWS, Math.floor(quantity || 1) - 1)
  return max && max > 0 ? Math.min(remaining, max) : remaining
}

/**
 * The repeatable rows currently held for a field.
 *
 * @param values - The form's values.
 * @param name - The field's name.
 * @returns The rows; a single empty row when the field holds none.
 */
export function rowsOf(values: CollectorAnswers, name: string): string[] {
  const raw = values[name]
  return Array.isArray(raw) ? raw : [""]
}

/**
 * Resizes one field's rows: the values kept, empty rows appended to grow and
 * the tail truncated to shrink, never below {@link MIN_ROWS}.
 *
 * Truncation **drops values** — a caller that may be discarding something the
 * buyer typed should plan first ({@link planQuantityChange}) and warn.
 *
 * @param rows - The rows as held.
 * @param target - The row count wanted.
 * @returns A new rows array at the target length.
 */
export function resizeRows(rows: string[], target: number): string[] {
  const size = Math.max(MIN_ROWS, target)
  const next = rows.slice(0, size)
  while (next.length < size) next.push("")
  return next
}

/** A quantity change resolved against the form: its row count and its losses. */
export type QuantityPlan = {
  /** The row count every repeatable field resizes to. */
  rowCount: number
  /** The named rows the change would drop; blanks are not reported. */
  dropped: string[]
}

/**
 * Plans a quantity change against the repeatable rows without committing it, so
 * a caller can warn before discarding a named row.
 *
 * The row count is the largest any repeatable field needs — `max` differs per
 * field, and a form renders each field's own count.
 *
 * @param fields - The collector's field definitions.
 * @param values - The form's current values.
 * @param quantity - The requested registration quantity.
 * @returns The target row count and the named rows the change would drop.
 */
export function planQuantityChange(
  fields: CollectorField[],
  values: CollectorAnswers,
  quantity: number
): QuantityPlan {
  const rowCounts = fields
    .filter((field) => field.repeatable)
    .map((field) => registrationRowCount(quantity, field.max))
  const rowCount = Math.max(MIN_ROWS, ...rowCounts)

  const dropped: string[] = []
  for (const field of fields) {
    if (!field.repeatable) continue
    dropped.push(
      ...rowsOf(values, field.name)
        .slice(rowCount)
        .filter((row) => row.trim().length > 0)
    )
  }

  return { rowCount, dropped }
}

/**
 * Applies a quantity change, resizing every repeatable field to mirror it.
 *
 * @param fields - The collector's field definitions.
 * @param values - The form's current values.
 * @param quantity - The requested registration quantity.
 * @returns The new values, the target row count, and the rows dropped.
 */
export function applyQuantityChange(
  fields: CollectorField[],
  values: CollectorAnswers,
  quantity: number
): QuantityPlan & { values: CollectorAnswers } {
  const plan = planQuantityChange(fields, values, quantity)
  const next = { ...values }

  for (const field of fields) {
    if (!field.repeatable) continue
    next[field.name] = resizeRows(rowsOf(values, field.name), plan.rowCount)
  }

  return { ...plan, values: next }
}
