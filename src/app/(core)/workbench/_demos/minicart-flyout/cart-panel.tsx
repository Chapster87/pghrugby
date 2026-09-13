"use client"

import { Pencil, Trash2, X } from "lucide-react"

import Button from "@components/button"

import { collectorDetail, money, pdpLabel, type PricedLine } from "./data"
import { CheckoutNote, LinePrice, Stepper, Thumb } from "./parts"
import type { FlyoutVariantProps } from "./store"
import s from "./style.module.css"

/**
 * PROTOTYPE (chosen) — the minicart's "Grouped cards" layout, retained as the
 * implementation reference from wayfinder ticket #63. Each add-to-cart action is
 * one bordered card: the primary line, its registration answers as a labelled
 * definition list, and its add-ons as an indented set.
 *
 * Line alignment is standardized: the quantity control sits top-right of the
 * line with the price directly beneath it; Edit/Remove carry icons and sit
 * below, aligned left. Throwaway by intent — synthetic fixtures only, Checkout
 * is a stub. Delete once the flyout is built for real
 * (`docs/agents/minicart-flyout-direction.md`).
 */
export default function CartPanel({
  cart,
  onEdit,
  onClose,
}: FlyoutVariantProps) {
  const empty = cart.primaries.length === 0

  // Group top-level lines by the add-to-cart action that created them.
  const groups: { key: string; lines: PricedLine[] }[] = []
  for (const line of cart.primaries) {
    const existing = groups.find((group) => group.key === line.groupRef)
    if (existing) existing.lines.push(line)
    else groups.push({ key: line.groupRef, lines: [line] })
  }

  return (
    <>
      <header className={s.head}>
        <h2 className={s.headTitle}>
          Cart
          {cart.itemCount > 0 && (
            <span className={s.headPill}>
              {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"}
            </span>
          )}
        </h2>
        <button
          type="button"
          className={s.close}
          onClick={onClose}
          aria-label="Close cart"
        >
          <X size={20} aria-hidden />
        </button>
      </header>

      {empty ? (
        <div className={s.empty}>
          <div className={s.emptyCard}>
            <p className={s.emptyTitle}>Nothing here yet</p>
            <p className={s.emptyText}>
              Add a ticket or registration and it will appear as a card.
            </p>
          </div>
          <Button variant="secondary" onClick={onClose}>
            Keep browsing
          </Button>
        </div>
      ) : (
        <>
          <div className={s.body}>
            {groups.map((group, groupIndex) => {
              const groupTotal = group.lines.reduce((sum, line) => {
                const addons = cart.addonsFor(line.id)
                return (
                  sum +
                  line.unitAmount * line.quantity +
                  addons.reduce(
                    (inner, addon) => inner + addon.unitAmount * addon.quantity,
                    0
                  )
                )
              }, 0)

              return (
                <section key={group.key} className={s.card}>
                  <header className={s.cardHead}>
                    <span className={s.cardTitle}>
                      {pdpLabel(group.lines[0].sourcePdp)}
                    </span>
                    <span className={s.cardTotal}>{money(groupTotal)}</span>
                  </header>

                  {group.lines.map((line, lineIndex) => {
                    const collector = cart.collectorFor(line.id)
                    const addons = cart.addonsFor(line.id)
                    return (
                      <div key={line.id} className={s.cardLine}>
                        <div className={s.cardLineRow}>
                          <Thumb
                            seed={groupIndex + lineIndex}
                            label={line.label}
                            className={s.cardThumb}
                          />
                          <div className={s.cardLineText}>
                            <span className={s.lineName}>{line.label}</span>
                            {line.note && (
                              <span className={s.lineNote}>{line.note}</span>
                            )}
                          </div>
                          <div className={s.lineRail}>
                            {line.quantityBearing && !collector ? (
                              <Stepper
                                line={line}
                                setQuantity={(quantity) =>
                                  cart.setQuantity(line.id, quantity)
                                }
                                index={groupIndex * 10 + lineIndex}
                              />
                            ) : (
                              <span className={s.qtyLabel}>
                                Qty. {line.quantity}
                              </span>
                            )}
                            <LinePrice line={line} />
                          </div>
                        </div>

                        {collector && (
                          <div className={s.answers}>
                            <dl className={s.answersList}>
                              {collectorDetail(collector).map((row) => (
                                <div key={row.label} className={s.answersRow}>
                                  <dt className={s.answersLabel}>
                                    {row.label}
                                  </dt>
                                  <dd className={s.answersValue}>
                                    {row.value}
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          </div>
                        )}

                        <div className={s.lineActions}>
                          {collector && (
                            <button
                              type="button"
                              id={`edit-${collector.id}`}
                              className={s.iconAction}
                              onClick={(event) =>
                                onEdit(collector.id, event.currentTarget)
                              }
                            >
                              <Pencil size={14} aria-hidden />
                              Edit
                            </button>
                          )}
                          <button
                            type="button"
                            className={s.iconActionDanger}
                            onClick={() => cart.remove(line.id)}
                          >
                            <Trash2 size={14} aria-hidden />
                            Remove
                          </button>
                        </div>

                        {addons.length > 0 && (
                          <ul className={s.cardAddons}>
                            {addons.map((addon, addonIndex) => (
                              <li key={addon.id} className={s.cardAddon}>
                                <div className={s.addonLeft}>
                                  <span className={s.addonName}>
                                    {addon.label}
                                  </span>
                                  <button
                                    type="button"
                                    className={s.iconActionDanger}
                                    onClick={() => cart.remove(addon.id)}
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
                                        cart.setQuantity(addon.id, quantity)
                                      }
                                      index={
                                        groupIndex * 100 +
                                        lineIndex * 10 +
                                        addonIndex
                                      }
                                    />
                                  ) : (
                                    <span className={s.qtyLabel}>
                                      Qty. {addon.quantity}
                                    </span>
                                  )}
                                  <LinePrice
                                    line={addon}
                                    className={s.addonPrice}
                                  />
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
            })}
          </div>

          <footer className={s.foot}>
            <div className={s.subtotalRow}>
              <span>Subtotal</span>
              <span>{money(cart.subtotal)}</span>
            </div>
            <Button size="large" className={s.checkout}>
              Checkout
            </Button>
            <CheckoutNote />
          </footer>
        </>
      )}
    </>
  )
}
