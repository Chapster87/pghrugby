"use client"

import { useRef, type MouseEvent } from "react"

import { useCart } from "@/components/cart"
import Button from "@components/button"
import CollectorFields from "@components/collector-form"
import { formatMoney } from "@/lib/checkout/cart-display"
import type { CartAddGroup } from "@/lib/checkout/cart-mutations"

import type { PdpViewModel } from "../../_data/types"
import { usePdpSelection } from "../../_hooks/use-pdp-selection"
import Gallery from "../gallery"
import {
  AddonRow,
  GroupedPrimaries,
  SinglePrimaryLine,
  VariationSelect,
} from "../option-selector"
import s from "./style.module.css"

/**
 * The PDP — gallery beside the buy box, the chosen "side-by-side" direction
 * (`docs/agents/pdp-layout-direction.md`).
 *
 * The buy box orders itself per the decision: title, intro, the full-description
 * anchor, the option selector for the page's `product_type`, add-ons, the
 * DataCollector, the running total, and **one** add-to-cart. "Add to cart"
 * commits a fully specified group — the primary line(s), their add-on lines, and
 * one collector entry carrying the answers plus a field snapshot — and opens the
 * flyout (`docs/pdp-to-minicart-to-checkout-spec.md` § 5.9).
 *
 * A client component because the whole buy box is interactive; every price and
 * product fact arrives resolved in the view model, so neither a content nor a
 * payment credential reaches the browser.
 */
export default function PdpLayout({ product }: { product: PdpViewModel }) {
  const sel = usePdpSelection(product)
  const { addToCart } = useCart()
  const descriptionRef = useRef<HTMLDivElement>(null)

  const goToDescription = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
    descriptionRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    })
  }

  const commit = () => {
    // Add-time rules, same as the edit panel's Save: required collector fields
    // must be valid before the line may join the cart.
    if (product.fields.length > 0 && !sel.collector.validate()) return

    const group: CartAddGroup = {
      primaries: sel.selectedPrimaries.map(({ line, quantity }) => ({
        sku: line.sku,
        quantity,
        quantityBearing: line.quantityBearing,
      })),
      addons: sel.selectedAddons.map(({ line, quantity }) => ({
        sku: line.sku,
        quantity,
        quantityBearing: line.quantityBearing,
      })),
      collector:
        product.fields.length > 0
          ? {
              collectorRef: product.collectorRef,
              answers: sel.collector.answers(),
              fields: product.fields,
            }
          : undefined,
    }

    addToCart(group, product.slug)
  }

  return (
    <div className={s.pdp}>
      <div className={s.top}>
        <Gallery photos={product.photos} title={product.title} />

        <div className={s.buyBox}>
          <header className={s.buyHead}>
            <h1 className={s.title}>{product.title}</h1>
            {product.shortDescription && (
              <p className={s.shortDescription}>{product.shortDescription}</p>
            )}
            {product.longDescription && (
              <a
                href="#pdp-full-description"
                className={s.descriptionLink}
                onClick={goToDescription}
              >
                Read the full description
                <span aria-hidden className={s.descriptionLinkArrow}>
                  ↓
                </span>
              </a>
            )}
          </header>

          {product.productType === "simple" &&
            product.primaries.map((line) => (
              <SinglePrimaryLine
                key={line.sku}
                line={line}
                quantity={sel.quantityOf(line.sku)}
                setQuantity={(quantity) =>
                  sel.setPrimaryQuantity(line.sku, quantity)
                }
              />
            ))}

          {product.productType === "variation" && (
            <>
              <VariationSelect
                primaries={product.primaries}
                value={sel.selectedSkus[0] ?? ""}
                onChange={sel.selectPrimary}
                label="Option"
                idPrefix={product.slug}
              />
              {sel.selectedPrimaries[0] && (
                <SinglePrimaryLine
                  line={sel.selectedPrimaries[0].line}
                  quantity={sel.selectedPrimaries[0].quantity}
                  setQuantity={(quantity) =>
                    sel.setPrimaryQuantity(
                      sel.selectedPrimaries[0].line.sku,
                      quantity
                    )
                  }
                />
              )}
            </>
          )}

          {product.productType === "grouped" && (
            <GroupedPrimaries
              primaries={product.primaries}
              isSelected={sel.isSelected}
              onToggle={sel.togglePrimary}
              quantityOf={sel.quantityOf}
              setQuantity={sel.setPrimaryQuantity}
            />
          )}

          {sel.pendingQuantity && (
            <div className={s.quantityWarning} role="alert">
              <p className={s.quantityWarningText}>
                {sel.pendingQuantity.dropped.length === 1
                  ? `This drops ${sel.pendingQuantity.dropped[0]}.`
                  : `This drops ${sel.pendingQuantity.dropped.join(", ")}.`}
              </p>
              <div className={s.quantityWarningActions}>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={sel.cancelQuantityDrop}
                >
                  Keep{" "}
                  {sel.pendingQuantity.dropped.length === 1 ? "it" : "them"}
                </Button>
                <Button
                  variant="primary"
                  size="small"
                  onClick={sel.confirmQuantityDrop}
                >
                  Discard
                </Button>
              </div>
            </div>
          )}

          {product.addons.length > 0 && (
            <div className={s.addons}>
              <span className={s.miniLabel}>Add-ons</span>
              {product.addons.map((line) => (
                <AddonRow
                  key={line.sku}
                  line={line}
                  selected={sel.addons[line.sku]?.selected ?? false}
                  quantity={sel.addons[line.sku]?.quantity ?? 1}
                  onToggle={(selected) => sel.setAddon(line.sku, selected)}
                  onQuantity={(quantity) =>
                    sel.setAddonQuantity(line.sku, quantity)
                  }
                />
              ))}
            </div>
          )}

          {product.fields.length > 0 && (
            <div className={s.buyBlock}>
              <span className={s.miniLabel}>Registration details</span>
              <CollectorFields
                fields={product.fields}
                values={sel.collector.values}
                errors={sel.collector.errors}
                rowsFor={sel.collector.rowsFor}
                onChange={sel.collector.setValue}
                onSetRow={sel.collector.setRow}
                onAddRow={sel.collector.addRow}
                onRemoveRow={sel.collector.removeRow}
                idPrefix={`pdp-${product.slug}`}
              />
            </div>
          )}

          <div className={s.totalRow}>
            <span>Total</span>
            <span>{formatMoney(sel.total)}</span>
          </div>

          <AddToCartButton
            onClick={commit}
            disabled={sel.lines.length === 0}
            unavailable={sel.unavailable}
          />
        </div>
      </div>

      {product.longDescription && (
        <div
          ref={descriptionRef}
          id="pdp-full-description"
          className={s.descriptionAnchor}
        >
          <h2 className={s.sectionTitle}>Description</h2>
          <p className={s.description}>{product.longDescription}</p>
        </div>
      )}
    </div>
  )
}

/**
 * The single add-to-cart action. It commits every selected line — the primary
 * priced line (or lines), the add-ons, and the collector entry — as one group.
 */
function AddToCartButton({
  onClick,
  disabled,
  unavailable,
}: {
  onClick: () => void
  disabled?: boolean
  /** Replaces the control entirely when no primary is buyable. */
  unavailable?: boolean
}) {
  if (unavailable) {
    return (
      <div className={s.addToCart}>
        <Button size="large" disabled className={s.addButton}>
          Registration closed
        </Button>
        <p className={s.unavailableNote}>
          Every option on this page is sold out. Check back soon.
        </p>
      </div>
    )
  }

  return (
    <div className={s.addToCart}>
      <Button
        size="large"
        disabled={disabled}
        onClick={onClick}
        className={s.addButton}
      >
        Add to cart
      </Button>
    </div>
  )
}
