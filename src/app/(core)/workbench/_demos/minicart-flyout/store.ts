"use client"

import { useCallback, useMemo, useState } from "react"

import type { CartEntry, CollectorEntry, PricedLine } from "./data"

/**
 * The cart the flyout variants render against. Derived views are recomputed
 * from `entries` on each render; mutations are the only writes.
 */
export type CartModel = {
  entries: CartEntry[]
  /** Priced lines in cart order. */
  lines: PricedLine[]
  /** Top-level priced lines (no `parentId`) — one row each in every variant. */
  primaries: PricedLine[]
  /** The collector entry linked to a primary line, if any. */
  collectorFor: (lineId: string) => CollectorEntry | undefined
  /** Add-on lines linked to a primary line. */
  addonsFor: (lineId: string) => PricedLine[]
  /** Sum of priced lines, minor units. */
  subtotal: number
  /** Units on top-level lines — the header badge / "N items" reading. */
  itemCount: number
  setQuantity: (id: string, quantity: number) => void
  remove: (id: string) => void
  /** Write a registration's answers and its primary line's quantity together. */
  saveCollector: (
    collectorId: string,
    answers: Record<string, string | string[]>,
    quantity: number
  ) => void
  /** Append a line, merging by sku for plain lines (the settled merge rule). */
  add: (line: PricedLine) => void
  /** Replace the whole cart, for the fixture toggle. */
  reset: (entries: CartEntry[]) => void
}

const clamp = (quantity: number, min = 1, max = 100) =>
  Math.min(max, Math.max(min, Math.floor(quantity || 1)))

/**
 * PROTOTYPE — in-memory cart state for the minicart flyout variants. No
 * persistence: the prototype's question is the flyout's look and behaviour, not
 * the store.
 *
 * @param seed - The fixture the cart starts from.
 * @returns The cart entries, derived views, and mutations.
 */
export function usePrototypeCart(seed: CartEntry[]): CartModel {
  const [entries, setEntries] = useState<CartEntry[]>(seed)

  const setQuantity = useCallback((id: string, quantity: number) => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === id && entry.kind === "product"
          ? { ...entry, quantity: clamp(quantity) }
          : entry
      )
    )
  }, [])

  const remove = useCallback((id: string) => {
    setEntries((prev) =>
      prev.filter((entry) => entry.id !== id && entry.parentId !== id)
    )
  }, [])

  const saveCollector = useCallback(
    (
      collectorId: string,
      answers: Record<string, string | string[]>,
      quantity: number
    ) => {
      setEntries((prev) => {
        const collector = prev.find((entry) => entry.id === collectorId)
        if (!collector || collector.kind !== "collector") return prev
        return prev.map((entry) => {
          if (entry.id === collectorId && entry.kind === "collector") {
            return { ...entry, answers }
          }
          if (entry.id === collector.parentId && entry.kind === "product") {
            return { ...entry, quantity: clamp(quantity) }
          }
          return entry
        })
      })
    },
    []
  )

  const add = useCallback((line: PricedLine) => {
    setEntries((prev) => {
      // Add-ons are keyed by (sku, parentId); plain lines merge by sku alone.
      const existing = prev.find(
        (entry) =>
          entry.kind === "product" &&
          entry.sku === line.sku &&
          entry.parentId === line.parentId
      )
      if (existing && existing.kind === "product") {
        return prev.map((entry) =>
          entry.id === existing.id && entry.kind === "product"
            ? { ...entry, quantity: clamp(entry.quantity + line.quantity) }
            : entry
        )
      }
      return [...prev, line]
    })
  }, [])

  const reset = useCallback((next: CartEntry[]) => setEntries(next), [])

  const lines = useMemo(
    () => entries.filter((entry): entry is PricedLine => entry.kind === "product"),
    [entries]
  )
  const primaries = useMemo(
    () => lines.filter((line) => !line.parentId),
    [lines]
  )
  const collectors = useMemo(
    () => entries.filter((entry): entry is CollectorEntry => entry.kind === "collector"),
    [entries]
  )

  const collectorFor = useCallback(
    (lineId: string) =>
      collectors.find((collector) => collector.parentId === lineId),
    [collectors]
  )
  const addonsFor = useCallback(
    (lineId: string) => lines.filter((line) => line.parentId === lineId),
    [lines]
  )

  const subtotal = lines.reduce(
    (sum, line) => sum + line.unitAmount * line.quantity,
    0
  )
  const itemCount = primaries.reduce((sum, line) => sum + line.quantity, 0)

  return {
    entries,
    lines,
    primaries,
    collectorFor,
    addonsFor,
    subtotal,
    itemCount,
    setQuantity,
    remove,
    saveCollector,
    add,
    reset,
  }
}

/** The props each flyout variant renders against. */
export type FlyoutVariantProps = {
  cart: CartModel
  /** Open the registration edit panel; `trigger` is refocused on return. */
  onEdit: (collectorId: string, trigger: HTMLElement | null) => void
  onClose: () => void
}
