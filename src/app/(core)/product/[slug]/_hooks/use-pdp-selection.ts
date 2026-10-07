"use client"

import { useCallback, useState } from "react"

import { useCollectorForm } from "@components/collector-form/use-collector-form"
import { clampLineQuantity } from "@/lib/checkout/cart-mutations"

import type { PdpLine, PdpViewModel } from "../_data/types"

/** An add-on's in-page state: whether it is ticked, and how many. */
type AddonState = Record<string, { selected: boolean; quantity: number }>

/** A quantity change held back because committing it would drop named rows. */
type PendingQuantity = { sku: string; quantity: number; dropped: string[] }

/** The primaries a fresh page selects: a `simple` page commits its in-stock
 * primaries without asking; the other two types start unselected. */
function initialSelectedSkus(product: PdpViewModel): string[] {
  return product.productType === "simple"
    ? product.primaries.filter((line) => line.inStock).map((line) => line.sku)
    : []
}

/** A fresh page's add-on state: every add-on unticked, quantity 1. */
function initialAddons(product: PdpViewModel): AddonState {
  return Object.fromEntries(
    product.addons.map((addon) => [addon.sku, { selected: false, quantity: 1 }])
  )
}

/**
 * The buyer's in-page selection state for one PDP.
 *
 * Quantity is per-line and never derived from the DataCollector
 * (`docs/agents/cart-line-model.md` § 4). The `product_type` decides how
 * primaries are chosen: `simple` commits its primaries without asking,
 * `variation` and `grouped` start unselected, and `grouped` selects several at
 * once.
 *
 * Re-key the consuming component by `product.slug` so a page change resets this.
 *
 * @param product - The PDP being rendered.
 * @returns The selection, its mutations, the collector form, and the committed lines.
 */
export function usePdpSelection(product: PdpViewModel) {
  const [selectedSkus, setSelectedSkus] = useState<string[]>(() =>
    initialSelectedSkus(product)
  )
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [addons, setAddons] = useState<AddonState>(() => initialAddons(product))
  const collector = useCollectorForm(product.fields)
  const [pending, setPending] = useState<PendingQuantity | null>(null)

  /**
   * Whether this page's quantity stepper drives the collector's rows. Only a
   * single-primary page with a collector has that shape — the same gate the
   * `quantity → rows` mirror uses below.
   */
  const mirrorsRows =
    product.productType === "simple" && product.fields.length > 0

  const quantityOf = (sku: string) => quantities[sku] ?? 1

  /** Writes a primary's quantity and mirrors it into the collector's rows. */
  const commitQuantity = (sku: string, quantity: number) => {
    setQuantities((prev) => ({ ...prev, [sku]: quantity }))
    if (mirrorsRows) collector.applyQuantity(quantity)
  }

  /**
   * Writes a primary's quantity and mirrors it into the collector's repeatable
   * rows (`quantity → rows`) — but only for a single-primary page, which is the
   * only shape a registration has.
   *
   * A change that would drop a **named** player row is held back for
   * confirmation rather than applied: the add-time form discards a name as
   * silently as the flyout's edit panel would, and the rule is the same on both
   * surfaces (`docs/agents/registration-editing.md` § 4).
   */
  const setPrimaryQuantity = (sku: string, quantity: number) => {
    const next = clampLineQuantity(quantity)
    if (!mirrorsRows) {
      commitQuantity(sku, next)
      return
    }

    const { dropped } = collector.planQuantity(next)
    if (dropped.length > 0) {
      setPending({ sku, quantity: next, dropped })
      return
    }
    commitQuantity(sku, next)
  }

  /** Applies the held-back change, dropping the rows the buyer accepted. */
  const confirmQuantityDrop = () => {
    if (!pending) return
    commitQuantity(pending.sku, pending.quantity)
    setPending(null)
  }

  /** Drops the held-back change, keeping the buyer's rows and quantity. */
  const cancelQuantityDrop = () => setPending(null)

  const selectPrimary = (sku: string) => setSelectedSkus([sku])

  const togglePrimary = (sku: string) =>
    setSelectedSkus((prev) =>
      prev.includes(sku) ? prev.filter((s) => s !== sku) : [...prev, sku]
    )

  const setAddon = (sku: string, selected: boolean) =>
    setAddons((prev) => ({
      ...prev,
      [sku]: { selected, quantity: prev[sku]?.quantity ?? 1 },
    }))

  const setAddonQuantity = (sku: string, quantity: number) =>
    setAddons((prev) => ({
      ...prev,
      [sku]: { selected: true, quantity: clampLineQuantity(quantity) },
    }))

  // Only in-stock lines are committed; a sold-out line renders disabled.
  const selectedPrimaries: { line: PdpLine; quantity: number }[] =
    product.primaries
      .filter((line) => selectedSkus.includes(line.sku) && line.inStock)
      .map((line) => ({
        line,
        quantity: line.quantityBearing ? quantityOf(line.sku) : 1,
      }))

  const selectedAddons: { line: PdpLine; quantity: number }[] = product.addons
    .filter((line) => addons[line.sku]?.selected && line.inStock)
    .map((line) => ({
      line,
      quantity: line.quantityBearing ? addons[line.sku]?.quantity ?? 1 : 1,
    }))

  const lines = [...selectedPrimaries, ...selectedAddons]

  const total = lines.reduce(
    (sum, entry) => sum + entry.line.unitAmount * entry.quantity,
    0
  )

  /**
   * Returns the page to a fresh state after a successful add: the initial
   * primary selection, cleared quantities and add-ons, and a blank collector —
   * so the next add starts clean instead of reusing the previous team's answers.
   */
  const reset = useCallback(() => {
    setSelectedSkus(initialSelectedSkus(product))
    setQuantities({})
    setAddons(initialAddons(product))
    collector.reset()
    setPending(null)
  }, [product, collector])

  return {
    selectedSkus,
    selectPrimary,
    togglePrimary,
    isSelected: (sku: string) => selectedSkus.includes(sku),
    quantityOf,
    setPrimaryQuantity,
    /** The quantity change held back because it would drop a named row. */
    pendingQuantity: pending,
    confirmQuantityDrop,
    cancelQuantityDrop,
    addons,
    setAddon,
    setAddonQuantity,
    collector,
    selectedPrimaries,
    selectedAddons,
    lines,
    total,
    reset,
    /** True when every primary on the page is sold out. */
    unavailable:
      product.primaries.length > 0 &&
      product.primaries.every((line) => !line.inStock),
  }
}
