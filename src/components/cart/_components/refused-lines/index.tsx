"use client"

import type { CartLineError } from "@/lib/checkout/cart-pricing"

import s from "./style.module.css"

/**
 * The per-line refusals the checkout raises — a sold-out line, a line with no
 * CMS record, an unpriced line.
 *
 * The server never drops a line and never blocks the whole cart for one bad
 * line, so the buyer has to see exactly which line is wrong and clear it: this
 * renders the summary plus one row per offending line, whose button is that
 * line's removal. Both surfaces that can be refused — the flyout's validate
 * call and the checkout page's session build — render this, so the two read
 * identically.
 *
 * @param props.message - The summary line; omitted when there is none.
 * @param props.errors - One entry per refused line.
 * @param props.onRemove - Removes the entry a refusal names (cascading).
 */
export default function RefusedLines({
  message,
  errors,
  onRemove,
}: {
  message?: string | null
  errors: CartLineError[]
  onRemove: (entryId: string) => void
}) {
  if (!message && errors.length === 0) return null

  return (
    <div className={s.problem} role="alert">
      {message && <p className={s.message}>{message}</p>}
      {errors.length > 0 && (
        <ul className={s.list}>
          {errors.map((error) => (
            <li key={`${error.entryId}-${error.code}`} className={s.row}>
              <span className={s.text}>{error.message}</span>
              <button
                type="button"
                className={s.remove}
                onClick={() => onRemove(error.entryId)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
