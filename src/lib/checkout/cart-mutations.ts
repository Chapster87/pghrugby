/**
 * The browser-held cart's pure mutation + derivation layer.
 *
 * The rules live here, free of React (and of `server-only`), so the store, the
 * flyout, and the scripted round-trip share one implementation of the settled
 * cart-line model: merge keys, cascade removal, and `quantity → rows` edits.
 * See `docs/agents/cart-line-model.md` § 2–4 and `cart-entries.ts`.
 *
 * Every function is total and non-mutating: it returns a new entry list, and an
 * unknown id is a no-op rather than an error.
 */

import {
  isCollectorEntry,
  isPricedLine,
  pricedLines,
  type CartEntry,
  type CollectorEntry,
  type CollectorField,
  type PricedLine,
} from "./cart-entries"

/**
 * Safety bound per line quantity, applied on every write. The real cap (e.g.
 * max golfers) lives in the DataCollector form definition; this is the floor
 * that stops a client sending 10,000 tickets.
 */
export const MAX_LINE_QUANTITY = 100

/** A priced line as the PDP specifies it — one sku and a buyer-set quantity. */
export type GroupLine = {
  sku: string
  quantity: number
  /** Snapshot of the product's `quantity_bearing` (see `PricedLine`). */
  quantityBearing?: boolean
}

/** A DataCollector's answers plus the field snapshot taken at add-time. */
export type GroupCollector = {
  collectorRef: string
  answers: Record<string, unknown>
  fields: CollectorField[]
}

/**
 * One add-to-cart action: the priced lines it commits, plus the optional
 * DataCollector payload. Every entry it creates shares the action's `groupRef`.
 *
 * `primaries` is a list because a `grouped` PDP commits several primaries in one
 * action (one "add all"); `simple` and `variation` commit exactly one. Add-ons
 * and the collector payload attach to the first primary — grouped pages carry
 * neither (`docs/pdp-to-minicart-to-checkout-spec.md` § 13).
 */
export type CartAddGroup = {
  primaries: GroupLine[]
  addons?: GroupLine[]
  collector?: GroupCollector
}

/** Mints entry ids; injectable so the round-trip script stays deterministic. */
export type IdFactory = (kind: "product" | "collector") => string

const clampQuantity = (quantity: number) =>
  Math.min(MAX_LINE_QUANTITY, Math.max(1, Math.floor(quantity || 1)))

/**
 * Clamps a line quantity to the server's write bounds: floored at 1 (leaving the
 * cart is an explicit remove, never a zero) and capped at `MAX_LINE_QUANTITY`.
 *
 * Shared by the client store, the PDP's selection state, and the server's
 * snapshot validation, so no surface can hold a quantity the snapshot would
 * reject or silently rewrite.
 *
 * @param quantity - The requested quantity, from any source.
 * @returns The clamp-safe quantity.
 */
export function clampLineQuantity(quantity: number): number {
  return clampQuantity(quantity)
}

/** The default id factory — a stable client-generated uuid per entry. */
export const uuidIdFactory: IdFactory = (kind) =>
  `${kind}-${crypto.randomUUID()}`

/**
 * True when a priced line is registration-bearing: a collector entry points at
 * it. Those lines never merge, so a second add is a second line.
 */
function hasCollector(entries: CartEntry[], lineId: string): boolean {
  return entries.some(
    (entry) => isCollectorEntry(entry) && entry.parentId === lineId
  )
}

/**
 * Appends one add-to-cart action to the cart, applying the merge rules.
 *
 * - A registration-bearing primary (the add carries a collector payload) never
 *   merges — every add is a new line plus a new collector entry.
 * - A plain primary (no collector, no `parentId`) merges by `sku`; quantities
 *   sum. The incoming add-ons are attached to the survivor, so they follow
 *   their primary without any re-parenting of existing rows.
 * - An add-on merges by `(sku, parentId)`; quantities sum.
 *
 * @param entries - The cart's current entries, in add order.
 * @param group - The action's primaries, add-ons, and collector payload.
 * @param context.sourcePdp - The PDP slug the action came from (a reporting tag).
 * @param context.groupRef - The action's grouping tag; minted when omitted.
 * @param context.idFactory - Id minter, injectable for deterministic checks.
 * @returns The entry list with the action applied.
 */
export function addGroup(
  entries: CartEntry[],
  group: CartAddGroup,
  context: {
    sourcePdp: string
    groupRef?: string
    idFactory?: IdFactory
  }
): CartEntry[] {
  const idFactory = context.idFactory ?? uuidIdFactory
  const groupRef = context.groupRef ?? `group-${crypto.randomUUID()}`
  const { sourcePdp } = context

  let next = entries
  const primaryIds: string[] = []

  for (const incoming of group.primaries) {
    const quantity = clampQuantity(incoming.quantity)
    // A registration-bearing add never merges: the collector entry is what makes
    // it one, and two registrations are two lines. A plain line merges by sku.
    const target =
      group.collector === undefined
        ? findMergeTarget(next, incoming.sku)
        : undefined

    if (target) {
      next = next.map((entry) =>
        entry.id === target.id && isPricedLine(entry)
          ? { ...entry, quantity: clampQuantity(entry.quantity + quantity) }
          : entry
      )
      primaryIds.push(target.id)
      continue
    }

    const id = idFactory("product")
    primaryIds.push(id)
    next = [
      ...next,
      {
        id,
        kind: "product",
        sku: incoming.sku,
        quantity,
        quantityBearing: incoming.quantityBearing,
        sourcePdp,
        groupRef,
      },
    ]
  }

  // Add-ons and the collector payload hang off the first primary: a grouped page
  // has neither, and a registration page has exactly one primary.
  const primaryId = primaryIds[0]

  for (const addon of group.addons ?? []) {
    const addonQuantity = clampQuantity(addon.quantity)
    const existing = next.find(
      (entry): entry is PricedLine =>
        isPricedLine(entry) &&
        entry.sku === addon.sku &&
        entry.parentId === primaryId
    )
    if (existing) {
      next = next.map((entry) =>
        entry.id === existing.id && isPricedLine(entry)
          ? {
              ...entry,
              quantity: clampQuantity(entry.quantity + addonQuantity),
            }
          : entry
      )
      continue
    }
    next = [
      ...next,
      {
        id: idFactory("product"),
        kind: "product",
        sku: addon.sku,
        quantity: addonQuantity,
        quantityBearing: addon.quantityBearing,
        sourcePdp,
        groupRef,
        parentId: primaryId,
      },
    ]
  }

  if (group.collector && primaryId) {
    const collector: CollectorEntry = {
      id: idFactory("collector"),
      kind: "collector",
      collectorRef: group.collector.collectorRef,
      answers: group.collector.answers,
      fields: group.collector.fields,
      sourcePdp,
      groupRef,
      parentId: primaryId,
    }
    next = [...next, collector]
  }

  return next
}

/**
 * The plain line an incoming `sku` may merge into: a priced line with no
 * `parentId` (an add-on never absorbs a primary) that no collector entry backs
 * (a registration line never merges).
 */
function findMergeTarget(
  entries: CartEntry[],
  sku: string
): PricedLine | undefined {
  return pricedLines(entries).find(
    (line) =>
      line.sku === sku && !line.parentId && !hasCollector(entries, line.id)
  )
}

/**
 * Writes a line's buyer-set quantity, floored at 1 and clamped at
 * `MAX_LINE_QUANTITY`. Leaving the cart is an explicit remove, not a zero.
 *
 * @param entries - The cart's entries.
 * @param id - The priced line to write.
 * @param quantity - The requested quantity.
 * @returns The entry list with the quantity applied.
 */
export function setEntryQuantity(
  entries: CartEntry[],
  id: string,
  quantity: number
): CartEntry[] {
  return entries.map((entry) =>
    entry.id === id && isPricedLine(entry)
      ? { ...entry, quantity: clampQuantity(quantity) }
      : entry
  )
}

/**
 * Removes an entry, cascading from a primary to its add-ons and its collector
 * entry. A collector entry cannot be removed on its own — it has no meaning
 * without its primary — so it is never a valid `id` here.
 *
 * @param entries - The cart's entries.
 * @param id - The entry to remove.
 * @returns The entry list without the entry and its children.
 */
export function removeEntry(entries: CartEntry[], id: string): CartEntry[] {
  return entries.filter((entry) => entry.id !== id && entry.parentId !== id)
}

/**
 * Writes a registration's answers and its primary line's quantity together —
 * the edit panel's save, where quantity owns the repeatable row count.
 *
 * @param entries - The cart's entries.
 * @param collectorId - The collector entry being edited.
 * @param answers - The replacement answers payload.
 * @param quantity - The replacement quantity for its primary line.
 * @returns The entry list with both writes applied.
 */
export function saveCollectorEntry(
  entries: CartEntry[],
  collectorId: string,
  answers: Record<string, unknown>,
  quantity: number
): CartEntry[] {
  const collector = entries.find(
    (entry): entry is CollectorEntry =>
      isCollectorEntry(entry) && entry.id === collectorId
  )
  if (!collector) return entries

  return entries.map((entry) => {
    if (entry.id === collectorId && isCollectorEntry(entry)) {
      return { ...entry, answers }
    }
    if (entry.id === collector.parentId && isPricedLine(entry)) {
      return { ...entry, quantity: clampQuantity(quantity) }
    }
    return entry
  })
}

/** A display card: the primaries one add-to-cart action created, in cart order. */
export type CartGroup = {
  key: string
  primaries: PricedLine[]
}

/** The derived, read-only views every cart surface renders against. */
export type CartModel = {
  /** The raw entry list, in add order. */
  entries: CartEntry[]
  /** Priced lines, in cart order — the Stripe line items. */
  lines: PricedLine[]
  /** Top-level priced lines (no `parentId`) — one row each in the flyout. */
  primaries: PricedLine[]
  /** Collector entries, one per registration add. */
  collectors: CollectorEntry[]
  /** The collector entry linked to a primary line, if any. */
  collectorFor: (lineId: string) => CollectorEntry | undefined
  /** Add-on lines linked to a primary line. */
  addonsFor: (lineId: string) => PricedLine[]
  /** Primaries grouped by the add-to-cart action that created them. */
  groups: CartGroup[]
  /** Sum of every priced line, in minor units, at the supplied amounts. */
  subtotal: number
  /** Units on top-level lines — the header count / "N items" reading. */
  itemCount: number
}

/**
 * Derives every view a cart surface needs from the flat entry list.
 *
 * Amounts are injected because the browser cart carries no prices (the server
 * stays the price authority): the flyout passes the catalog lookup, so a sku
 * the catalog no longer knows counts as zero rather than crashing the surface.
 *
 * @param entries - The cart's entries, in add order.
 * @param amountFor - Resolves a sku's unit amount in minor units.
 * @returns The derived model.
 */
export function deriveCartModel(
  entries: CartEntry[],
  amountFor: (sku: string) => number
): CartModel {
  const lines = pricedLines(entries)
  const primaries = lines.filter((line) => !line.parentId)
  const collectors = entries.filter(isCollectorEntry)

  const groups: CartGroup[] = []
  for (const line of primaries) {
    const existing = groups.find((group) => group.key === line.groupRef)
    if (existing) existing.primaries.push(line)
    else groups.push({ key: line.groupRef, primaries: [line] })
  }

  return {
    entries,
    lines,
    primaries,
    collectors,
    collectorFor: (lineId) =>
      collectors.find((collector) => collector.parentId === lineId),
    addonsFor: (lineId) => lines.filter((line) => line.parentId === lineId),
    groups,
    subtotal: lines.reduce(
      (sum, line) => sum + amountFor(line.sku) * line.quantity,
      0
    ),
    itemCount: primaries.reduce((sum, line) => sum + line.quantity, 0),
  }
}

/**
 * A collector entry's answers as a flat display list, one row per answered
 * field. Repeatable answers collapse to one comma-joined row, so a card can
 * render a definition list without knowing the field shapes.
 *
 * @param entry - The collector entry whose snapshotted fields/answers to read.
 * @returns One `{ label, value }` per answered field, empties dropped.
 */
export function collectorDetail(
  entry: CollectorEntry
): { label: string; value: string }[] {
  return entry.fields
    .map((field) => {
      const raw = entry.answers[field.name]
      const value = Array.isArray(raw)
        ? raw.filter((row) => String(row).trim()).join(", ")
        : raw === undefined || raw === null
        ? ""
        : String(raw)
      return { label: field.label, value }
    })
    .filter((row) => row.value.trim().length > 0)
}
