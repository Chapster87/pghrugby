"use client"

import clsx from "clsx"

import QuantitySelector from "@components/quantity-selector"

import { money, type PricedLine } from "./data"
import s from "./style.module.css"

/**
 * A line thumbnail. A tinted placeholder with initials stands in for the Stripe
 * `Product.images` thumbnail the real flyout would use (per #55).
 *
 * @param props.seed - Cycles the placeholder tint.
 * @param props.label - Supplies the initials.
 * @param props.className - Size/layout class from the hosting variant.
 */
export function Thumb({
  seed,
  label,
  className,
}: {
  seed: number
  label: string
  className?: string
}) {
  const initials = label
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()

  return (
    <span
      aria-hidden
      className={clsx(s.thumb, s[`tone${seed % 4}`], className)}
    >
      {initials}
    </span>
  )
}

/** A line's extended price (unit × quantity), minor units. */
export function LinePrice({
  line,
  className,
}: {
  line: PricedLine
  className?: string
}) {
  return (
    <span className={clsx(s.price, className)}>
      {money(line.unitAmount * line.quantity)}
    </span>
  )
}

/**
 * The shared quantity stepper, for quantity-bearing lines that are not
 * registration-backed (those delegate quantity to the edit panel, per #58).
 *
 * The global `QuantitySelector` sets its own root class, so it must not receive
 * a `className` (its prop spread would override that class and drop the PDP
 * field styling). Wrap it instead.
 *
 * @param props.line - The line the stepper edits.
 * @param props.setQuantity - Commits the new quantity to the cart.
 * @param props.index - Varies the input's name across lines.
 * @param props.className - Layout class from the hosting layout.
 */
export function Stepper({
  line,
  setQuantity,
  index,
  className,
}: {
  line: PricedLine
  setQuantity: (quantity: number) => void
  index?: number
  className?: string
}) {
  return (
    <div className={clsx(s.stepper, className)}>
      <QuantitySelector
        quantity={line.quantity}
        setQuantity={setQuantity}
        index={index}
      />
    </div>
  )
}

/** The prototype's stand-in for the real Checkout call — never a real mutation. */
export function CheckoutNote() {
  return (
    <p className={s.checkoutNote}>
      Stub — would create a Stripe Checkout Session for every priced line in
      cart order.
    </p>
  )
}
