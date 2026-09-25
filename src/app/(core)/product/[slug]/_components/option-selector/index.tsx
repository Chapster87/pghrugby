"use client"

import clsx from "clsx"

import Checkbox from "@components/checkbox"
import QuantitySelector from "@components/quantity-selector"
import Select from "@components/select"
import { formatMoney } from "@/lib/checkout/cart-display"

import type { PdpLine } from "../../_data/types"
import s from "./style.module.css"

/**
 * The buy box's option controls — how a page's `product_type` chooses its
 * primary, plus the add-ons and the line primitives they share.
 *
 * `simple` and `variation` both end at `SinglePrimaryLine` (the price card);
 * `variation` reaches it through `VariationSelect` and `grouped` through
 * `GroupedPrimaries`. A sold-out line always renders disabled and labelled,
 * never hidden (`docs/pdp-to-minicart-to-checkout-spec.md` § 5.5).
 */

/**
 * A line's price: the amount, with the regular amount struck through ahead of it
 * while a sale is running (`docs/agents/pdp-pricing-and-sale-windows.md`).
 *
 * The two spans are separated by JSX whitespace rather than a gap, so this stays a
 * plain inline pair in every price context the buy box uses it in.
 */
export function LinePrice({
  line,
  className,
}: {
  line: PdpLine
  className?: string
}) {
  return (
    <span className={clsx(s.price, className)}>
      {line.compareAtAmount !== null && (
        <span className={s.compareAt}>{formatMoney(line.compareAtAmount)}</span>
      )}
      <span>{formatMoney(line.unitAmount)}</span>
    </span>
  )
}

/** A sold-out marker. Sold-out lines render disabled and labelled, never hidden. */
export function SoldOutBadge() {
  return <span className={s.soldOut}>Sold out</span>
}

/**
 * The quantity stepper, for quantity-bearing lines.
 *
 * The global `QuantitySelector` sets its own root class, so it must not receive
 * a `className` (its prop spread would override that class and drop the field
 * styling). Wrap it instead.
 */
export function QuantityStepper({
  quantity,
  setQuantity,
  className,
}: {
  quantity: number
  setQuantity: (quantity: number) => void
  className?: string
}) {
  return (
    <div className={clsx(s.stepper, className)}>
      <QuantitySelector quantity={quantity} setQuantity={setQuantity} />
    </div>
  )
}

/**
 * The price card for a single-primary page (`product_type: simple`): the line, its
 * name, its price, and a stepper only when it is quantity-bearing.
 */
export function SinglePrimaryLine({
  line,
  quantity,
  setQuantity,
}: {
  line: PdpLine
  quantity: number
  setQuantity: (quantity: number) => void
}) {
  return (
    <div className={clsx(s.singlePrimary, !line.inStock && s.lineDisabled)}>
      <div className={s.lineText}>
        <span className={s.lineName}>{line.label}</span>
      </div>
      <div className={s.lineEnd}>
        {line.inStock ? <LinePrice line={line} /> : <SoldOutBadge />}
        {line.inStock && line.quantityBearing && (
          <QuantityStepper quantity={quantity} setQuantity={setQuantity} />
        )}
      </div>
    </div>
  )
}

/**
 * The option selector for a multi-primary page (`product_type: variation`): a
 * dropdown with **no preselection**, sold-out options disabled and labelled;
 * the chosen option then renders the same price card as a simple page.
 */
export function VariationSelect({
  primaries,
  value,
  onChange,
  label,
  idPrefix,
}: {
  primaries: PdpLine[]
  value: string
  onChange: (sku: string) => void
  label: string
  idPrefix: string
}) {
  const id = `${idPrefix}-primary`
  return (
    <div className={s.field}>
      <label className={s.fieldLabel} htmlFor={id}>
        {label}
      </label>
      <Select.Root value={value || undefined} onValueChange={onChange}>
        <Select.Trigger id={id}>
          <Select.Value placeholder="Choose an option" />
          <Select.Icon />
        </Select.Trigger>
        <Select.Portal>
          <Select.Content>
            <Select.Viewport>
              {primaries.map((line) => (
                <Select.Item
                  key={line.sku}
                  value={line.sku}
                  disabled={!line.inStock}
                >
                  <Select.ItemIndicator />
                  <Select.ItemText>
                    {line.label} — {formatMoney(line.unitAmount)}
                    {line.inStock ? "" : " (sold out)"}
                  </Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  )
}

/**
 * The option selector for a multi-primary page (`product_type: grouped`): a
 * checkbox per primary, each selected one rendering its own price card and
 * stepper, committed together by one add-to-cart. Grouped pages with add-ons are
 * deferred (`docs/pdp-to-minicart-to-checkout-spec.md` § 13).
 */
export function GroupedPrimaries({
  primaries,
  isSelected,
  onToggle,
  quantityOf,
  setQuantity,
}: {
  primaries: PdpLine[]
  isSelected: (sku: string) => boolean
  onToggle: (sku: string) => void
  quantityOf: (sku: string) => number
  setQuantity: (sku: string, quantity: number) => void
}) {
  return (
    <div className={s.grouped}>
      {primaries.map((line) => {
        const selected = isSelected(line.sku)
        return (
          <div
            key={line.sku}
            className={clsx(s.groupedRow, !line.inStock && s.lineDisabled)}
          >
            <Checkbox.Label className={s.groupedLabel}>
              <Checkbox.Root
                checked={selected}
                onCheckedChange={() => onToggle(line.sku)}
                disabled={!line.inStock}
              >
                <Checkbox.Indicator />
              </Checkbox.Root>
              <span className={s.lineText}>
                <span className={s.lineName}>{line.label}</span>
              </span>
            </Checkbox.Label>
            <div className={s.lineEnd}>
              {line.inStock ? <LinePrice line={line} /> : <SoldOutBadge />}
              {line.inStock && selected && line.quantityBearing && (
                <QuantityStepper
                  quantity={quantityOf(line.sku)}
                  setQuantity={(quantity) => setQuantity(line.sku, quantity)}
                />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * An optional add-on row. Sold-out add-ons render disabled and labelled "Sold
 * out" — never hidden — and a selected quantity-bearing add-on shows its
 * stepper.
 */
export function AddonRow({
  line,
  selected,
  quantity,
  onToggle,
  onQuantity,
}: {
  line: PdpLine
  selected: boolean
  quantity: number
  onToggle: (selected: boolean) => void
  onQuantity: (quantity: number) => void
}) {
  return (
    <div className={clsx(s.addonRow, !line.inStock && s.lineDisabled)}>
      <Checkbox.Label className={s.addonLabel}>
        <Checkbox.Root
          checked={selected}
          onCheckedChange={(checked) => onToggle(checked === true)}
          disabled={!line.inStock}
        >
          <Checkbox.Indicator />
        </Checkbox.Root>
        <span className={s.lineText}>
          <span className={s.lineName}>{line.label}</span>
        </span>
      </Checkbox.Label>
      <div className={s.lineEnd}>
        {line.inStock ? <LinePrice line={line} /> : <SoldOutBadge />}
        {line.inStock && selected && line.quantityBearing && (
          <QuantityStepper quantity={quantity} setQuantity={onQuantity} />
        )}
      </div>
    </div>
  )
}
