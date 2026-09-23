"use client"

import Image from "next/image"
import { Pencil, Trash2 } from "lucide-react"

import QuantitySelector from "@components/quantity-selector"
import type { PricedLine } from "@/lib/checkout/cart-entries"
import {
  formatMoney,
  lineLabel,
  lineUnitAmount,
  pdpLabel,
} from "@/lib/checkout/cart-display"
import { collectorDetail, type CartGroup } from "@/lib/checkout/cart-mutations"

import { useCart } from "../../context"
import s from "./style.module.css"

/**
 * One add-to-cart action's card in the flyout — the chosen "grouped cards"
 * direction (`docs/agents/minicart-flyout-direction.md` § 3).
 *
 * Cards group top-level priced lines by `groupRef` (a display tag, never an
 * identity key): a header naming the source PDP and the group total, then each
 * primary line with its registration answers and its indented add-ons.
 *
 * Line alignment is standardized: the quantity control sits top-right with the
 * extended price beneath it on the right rail. A line whose quantity is locked
 * in the flyout — registration-backed (the edit panel owns quantity) or not
 * quantity-bearing — shows `Qty. N` in that slot instead of a stepper.
 *
 * @param props.group - The primaries one add-to-cart action created.
 * @param props.thumbnails - Resolved sku → thumbnail URL, possibly incomplete.
 * @param props.onEdit - Opens the registration edit panel for a collector entry.
 */
export default function CartLineCard({
  group,
  thumbnails,
  onEdit,
}: {
  group: CartGroup
  thumbnails: Record<string, string>
  onEdit: (collectorId: string) => void
}) {
  const { model, remove, setQuantity } = useCart()

  const groupTotal = group.primaries.reduce((sum, line) => {
    const addons = model.addonsFor(line.id)
    return (
      sum +
      lineTotal(line) +
      addons.reduce((inner, addon) => inner + lineTotal(addon), 0)
    )
  }, 0)

  return (
    <section className={s.card}>
      <header className={s.cardHead}>
        <span className={s.cardTitle}>
          {pdpLabel(group.primaries[0]?.sourcePdp ?? "")}
        </span>
        <span className={s.cardTotal}>{formatMoney(groupTotal)}</span>
      </header>

      {group.primaries.map((line) => {
        const collector = model.collectorFor(line.id)
        const answers = collector ? collectorDetail(collector) : []
        const addons = model.addonsFor(line.id)

        return (
          <div key={line.id} className={s.cardLine}>
            <div className={s.cardLineRow}>
              <LineThumb
                url={thumbnails[line.sku]}
                className={`${s.thumb} ${s.cardThumb}`}
              />
              <div className={s.cardLineText}>
                <span className={s.lineName}>{lineLabel(line.sku)}</span>
              </div>
              <div className={s.lineRail}>
                {line.quantityBearing && !collector ? (
                  <Stepper
                    line={line}
                    setQuantity={(quantity) => setQuantity(line.id, quantity)}
                  />
                ) : (
                  <span className={s.qtyLabel}>Qty. {line.quantity}</span>
                )}
                <span className={s.price}>{formatMoney(lineTotal(line))}</span>
              </div>
            </div>

            {answers.length > 0 && (
              <div className={s.answers}>
                <dl className={s.answersList}>
                  {answers.map((row) => (
                    <div key={row.label} className={s.answersRow}>
                      <dt className={s.answersLabel}>{row.label}</dt>
                      <dd className={s.answersValue}>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <div className={s.lineActions}>
              {collector && (
                <button
                  type="button"
                  id={`cart-edit-${collector.id}`}
                  className={s.iconAction}
                  onClick={() => onEdit(collector.id)}
                >
                  <Pencil size={14} aria-hidden />
                  Edit
                </button>
              )}
              <button
                type="button"
                className={s.iconActionDanger}
                onClick={() => remove(line.id)}
              >
                <Trash2 size={14} aria-hidden />
                Remove
              </button>
            </div>

            {addons.length > 0 && (
              <ul className={s.cardAddons}>
                {addons.map((addon) => (
                  <li key={addon.id} className={s.cardAddon}>
                    <div className={s.addonLeft}>
                      <span className={s.addonName}>{lineLabel(addon.sku)}</span>
                      <button
                        type="button"
                        className={s.iconActionDanger}
                        onClick={() => remove(addon.id)}
                      >
                        <Trash2 size={14} aria-hidden />
                        Remove
                      </button>
                    </div>
                    <div className={s.lineRail}>
                      {addon.quantityBearing ? (
                        <Stepper
                          line={addon}
                          setQuantity={(quantity) =>
                            setQuantity(addon.id, quantity)
                          }
                        />
                      ) : (
                        <span className={s.qtyLabel}>Qty. {addon.quantity}</span>
                      )}
                      <span className={`${s.price} ${s.addonPrice}`}>
                        {formatMoney(lineTotal(addon))}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </section>
  )
}

/** A line's extended price (unit × quantity), in minor units. */
function lineTotal(line: PricedLine): number {
  return lineUnitAmount(line.sku) * line.quantity
}

/**
 * A line's thumbnail, from the Stripe product image resolved for its sku. Falls
 * back to a neutral block while the resolution is in flight or when the product
 * carries no image.
 */
function LineThumb({ url, className }: { url?: string; className: string }) {
  if (!url) return <span aria-hidden className={className} />
  return <Image src={url} alt="" width={44} height={44} className={className} />
}

/**
 * The shared quantity stepper.
 *
 * The global `QuantitySelector` sets its own root class, so it must not receive
 * a `className` (its prop spread would override that class and drop the field
 * styling). Wrap it instead.
 */
function Stepper({
  line,
  setQuantity,
}: {
  line: PricedLine
  setQuantity: (quantity: number) => void
}) {
  return (
    <div className={s.stepper}>
      <QuantitySelector quantity={line.quantity} setQuantity={setQuantity} />
    </div>
  )
}
