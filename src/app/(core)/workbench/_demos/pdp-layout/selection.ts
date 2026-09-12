import { useState } from "react"

import type { PdpFixture, PdpLine } from "./data"

/** A line the buyer has committed to, with its resolved quantity. */
export type SelectedLine = {
  line: PdpLine
  /** "primary" | "addon" — for display grouping. */
  kind: "primary" | "addon"
  quantity: number
}

type AddonState = Record<string, { selected: boolean; qty: number }>

/**
 * PROTOTYPE — the buyer's in-page selection state. Quantity is per-line and
 * never derived from the DataCollector (decided in #69).
 *
 * @param product - The fixture the state is seeded from. Re-key the consuming
 *   component by `product.slug` so a fixture switch resets this state.
 * @returns The selection state and the actions the layout needs.
 */
export function usePdpSelection(product: PdpFixture) {
  // `simple` preselects its one primary; `variation` / `grouped` start
  // unselected (no preselection, per the settled control semantics in #69).
  const [primaryId, setPrimaryId] = useState(
    product.productType === "simple"
      ? (product.primaries.find((line) => line.inStock)?.id ?? "")
      : ""
  )
  const [primaryQty, setPrimaryQty] = useState(1)
  const [addons, setAddons] = useState<AddonState>(() =>
    Object.fromEntries(
      product.addons.map((addon) => [addon.id, { selected: false, qty: 1 }])
    )
  )
  const [values, setValues] = useState<Record<string, string>>({})
  const [repeatables, setRepeatables] = useState<Record<string, string[]>>(
    Object.fromEntries(
      product.fields
        .filter((field) => field.repeatable)
        .map((field) => [field.name, [""]])
    )
  )

  const primary = product.primaries.find((line) => line.id === primaryId) ?? null

  const setAddon = (id: string, selected: boolean) =>
    setAddons((prev) => ({
      ...prev,
      [id]: { selected, qty: prev[id]?.qty ?? 1 },
    }))

  const setAddonQty = (id: string, qty: number) =>
    setAddons((prev) => ({
      ...prev,
      [id]: { selected: true, qty: Math.min(99, Math.max(1, qty)) },
    }))

  const toggleAddon = (id: string) =>
    setAddons((prev) => ({
      ...prev,
      [id]: { selected: !prev[id]?.selected, qty: prev[id]?.qty ?? 1 },
    }))

  const setValue = (name: string, value: string) =>
    setValues((prev) => ({ ...prev, [name]: value }))

  const setRepeatableRow = (name: string, index: number, value: string) =>
    setRepeatables((prev) => {
      const rows = [...(prev[name] ?? [""])]
      rows[index] = value
      return { ...prev, [name]: rows }
    })

  const addRepeatableRow = (name: string, max?: number) =>
    setRepeatables((prev) => {
      const rows = [...(prev[name] ?? [""])]
      if (max && rows.length >= max) return prev
      rows.push("")
      return { ...prev, [name]: rows }
    })

  const removeRepeatableRow = (name: string, index: number) =>
    setRepeatables((prev) => {
      const rows = [...(prev[name] ?? [""])]
      if (rows.length <= 1) return prev
      rows.splice(index, 1)
      return { ...prev, [name]: rows }
    })

  const lines: SelectedLine[] = []
  if (primary && primary.inStock) {
    lines.push({
      line: primary,
      kind: "primary",
      quantity: primary.quantityBearing ? primaryQty : 1,
    })
  }
  for (const addon of product.addons) {
    const state = addons[addon.id]
    if (!state?.selected) continue
    lines.push({
      line: addon,
      kind: "addon",
      quantity: addon.quantityBearing ? state.qty : 1,
    })
  }

  const total = lines.reduce(
    (sum, entry) => sum + entry.line.unitAmount * entry.quantity,
    0
  )

  return {
    primary,
    primaryId,
    setPrimaryId,
    primaryQty,
    setPrimaryQty,
    addons,
    toggleAddon,
    setAddon,
    setAddonQty,
    values,
    setValue,
    repeatables,
    setRepeatableRow,
    addRepeatableRow,
    removeRepeatableRow,
    lines,
    total,
  }
}
