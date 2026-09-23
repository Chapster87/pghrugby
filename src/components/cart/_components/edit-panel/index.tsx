"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeft } from "lucide-react"

import Button from "@components/button"
import CollectorFields from "@components/collector-form"
import { useCollectorForm } from "@components/collector-form/use-collector-form"
import QuantitySelector from "@components/quantity-selector"
import type { CollectorEntry, PricedLine } from "@/lib/checkout/cart-entries"
import { lineLabel } from "@/lib/checkout/cart-display"
import { MAX_LINE_QUANTITY } from "@/lib/checkout/cart-mutations"

import s from "./style.module.css"

/**
 * The registration edit panel — the flyout Dialog's second view
 * (`docs/agents/registration-editing.md` § 5).
 *
 * It mutates the linked `CollectorEntry`'s answers and the primary
 * `PricedLine`'s quantity **together** and nothing else (§ 3): the entry keeps
 * its id and `parentId`, add-ons survive, and cart order is stable. Quantity
 * drives the repeatable rows (`quantity → rows`), and lowering it below a named
 * row warns before discarding (§ 4). Nothing commits until Save; Cancel
 * discards everything (§ 6).
 *
 * @param props.collector - The collector entry being edited.
 * @param props.primary - The registration line the entry is linked to.
 * @param props.onSave - Commits answers and quantity together.
 * @param props.onBack - Returns to the cart list, discarding the edit.
 */
export default function EditPanel({
  collector,
  primary,
  onSave,
  onBack,
}: {
  collector: CollectorEntry
  primary: PricedLine
  onSave: (answers: Record<string, unknown>, quantity: number) => void
  onBack: () => void
}) {
  const form = useCollectorForm(collector.fields, collector.answers)
  const [quantity, setQuantity] = useState(primary.quantity)
  /** A quantity change held back because it would drop a named row. */
  const [pendingQuantity, setPendingQuantity] = useState<number | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Focus lands on the first field so the journey round-trips without a mouse;
  // the flyout returns focus to the Edit control on the way back.
  useEffect(() => {
    const first = panelRef.current?.querySelector<HTMLElement>(
      "input, select, textarea, button"
    )
    first?.focus()
  }, [])

  // Golf is the worked case: four is the foursome, so the cap is the
  // repeatable field's snapshot `max` plus the first (named) player.
  const repeatableMax = Math.max(
    0,
    ...collector.fields
      .filter((field) => field.repeatable)
      .map((field) => field.max ?? 0)
  )
  const maxQuantity = repeatableMax > 0 ? repeatableMax + 1 : MAX_LINE_QUANTITY

  const changeQuantity = (next: number) => {
    const clamped = Math.min(maxQuantity, Math.max(1, next))
    const { dropped } = form.planQuantity(clamped)
    if (dropped.length > 0) {
      // Never silently discard a name (§ 4): hold the change and warn.
      setPendingQuantity(clamped)
      return
    }
    setQuantity(clamped)
    form.applyQuantity(clamped)
  }

  const discardAndApply = () => {
    if (pendingQuantity === null) return
    setQuantity(pendingQuantity)
    form.applyQuantity(pendingQuantity)
    setPendingQuantity(null)
  }

  const droppedNames =
    pendingQuantity === null ? [] : form.planQuantity(pendingQuantity).dropped

  return (
    <div className={s.editPanel} ref={panelRef}>
      <header className={s.editHead}>
        <button type="button" className={s.back} onClick={onBack}>
          <ArrowLeft size={14} aria-hidden />
          Back to cart
        </button>
        <span className={s.editTitle}>{lineLabel(primary.sku)}</span>
      </header>

      <div className={s.editBody}>
        <div className={s.editQty}>
          <span className={s.editQtyLabel}>Registrations</span>
          <QuantitySelector quantity={quantity} setQuantity={changeQuantity} />
          <span className={s.editHint}>
            One registration per person — the repeatable rows below mirror this
            count.
          </span>
        </div>

        {pendingQuantity !== null && (
          <div className={s.warning} role="alert">
            <p className={s.warningText}>
              {droppedNames.length === 1
                ? `This drops ${droppedNames[0]}.`
                : `This drops ${droppedNames.join(", ")}.`}
            </p>
            <div className={s.warningActions}>
              <Button
                variant="secondary"
                size="small"
                onClick={() => setPendingQuantity(null)}
              >
                Keep {droppedNames.length === 1 ? "it" : "them"}
              </Button>
              <Button variant="primary" size="small" onClick={discardAndApply}>
                Discard
              </Button>
            </div>
          </div>
        )}

        <CollectorFields
          fields={collector.fields}
          values={form.values}
          errors={form.errors}
          rowsFor={form.rowsFor}
          onChange={form.setValue}
          onSetRow={form.setRow}
          onAddRow={form.addRow}
          onRemoveRow={form.removeRow}
          idPrefix="cart-edit"
        />
      </div>

      <footer className={s.editFoot}>
        <Button variant="secondary" onClick={onBack}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            if (!form.validate()) return
            onSave(form.answers(), quantity)
          }}
        >
          Save
        </Button>
      </footer>
    </div>
  )
}
