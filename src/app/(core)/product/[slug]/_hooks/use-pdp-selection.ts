"use client"

import { useState } from "react"

import { useCollectorForm } from "@components/collector-form/use-collector-form"
import { clampLineQuantity } from "@/lib/checkout/cart-mutations"

import type { PdpLine, PdpViewModel } from "../_data/types"

/** An add-on's in-page state: whether it is ticked, and how many. */
type AddonState = Record<string, { selected: boolean; quantity: number }>

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
    // A `simple` page commits its primaries without asking; the other two types
    // start unselected (no preselection, per the settled control semantics).
    product.productType === "simple"
      ? product.primaries.filter((line) => line.inStock).map((line) => line.sku)
      : []
  )
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [addons, setAddons] = useState<AddonState>(() =>
    Object.fromEntries(
      product.addons.map((addon) => [
        addon.sku,
        { selected: false, quantity: 1 },
      ])
    )
  )
  const collector = useCollectorForm(product.fields)

  const quantityOf = (sku: string) => quantities[sku] ?? 1

  /**
   * Writes a primary's quantity and mirrors it into the collector's repeatable
   * rows (`quantity → rows`) — but only for a single-primary page, which is the
   * only shape a registration has.
   */
  const setPrimaryQuantity = (sku: string, quantity: number) => {
    const next = clampLineQuantity(quantity)
    setQuantities((prev) => ({ ...prev, [sku]: next }))
    if (product.productType === "simple" && product.fields.length > 0) {
      collector.applyQuantity(next)
    }
  }

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

  return {
    selectedSkus,
    selectPrimary,
    togglePrimary,
    isSelected: (sku: string) => selectedSkus.includes(sku),
    quantityOf,
    setPrimaryQuantity,
    addons,
    setAddon,
    setAddonQuantity,
    collector,
    selectedPrimaries,
    selectedAddons,
    lines,
    total,
    /** True when every primary on the page is sold out. */
    unavailable:
      product.primaries.length > 0 &&
      product.primaries.every((line) => !line.inStock),
  }
}
