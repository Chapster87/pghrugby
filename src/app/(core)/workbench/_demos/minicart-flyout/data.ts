/**
 * PROTOTYPE — synthetic minicart fixtures for wayfinder ticket #63. Not wired to
 * DatoCMS, Stripe, or the cart API, and not meant to be promoted as-is.
 *
 * The shapes mirror the settled cart-line model (`docs/agents/cart-line-model.md`)
 * and its registration-editing amendment (`docs/agents/registration-editing.md`):
 * the cart is a flat ordered list of **entries** — priced lines (the only Stripe
 * line items) and collector entries (the DataCollector answers, unpriced). A
 * primary line's add-ons and collector entry link back through `parentId`.
 */

/** A DataCollector field definition, snapshotted onto a collector entry at add-time. */
export type CartField = {
  name: string
  label: string
  type: "text" | "email" | "select"
  required?: boolean
  repeatable?: boolean
  max?: number
  options?: string[]
  placeholder?: string
}

/** A priced line — one sku, a buyer-set quantity, the only kind Stripe bills. */
export type PricedLine = {
  id: string
  kind: "product"
  sku: string
  label: string
  note?: string
  /** Minor units (cents). */
  unitAmount: number
  quantity: number
  /** Renders a stepper wherever the line is editable. */
  quantityBearing: boolean
  /** PDP slug the entry was added from — a reporting tag, never an identity key. */
  sourcePdp: string
  /** The add-to-cart action that created the entry; groups display only. */
  groupRef: string
  /** On an add-on: the id of the primary line it was added with. */
  parentId?: string
}

/** The DataCollector answers for one add — a "faux line item" with no sku or price. */
export type CollectorEntry = {
  id: string
  kind: "collector"
  collectorRef: string
  label: string
  /** Snapshot of the collector's field definitions at add-time. */
  fields: CartField[]
  answers: Record<string, string | string[]>
  sourcePdp: string
  groupRef: string
  /** The primary priced line this registration belongs to. */
  parentId: string
  /** PROTOTYPE-ONLY: the registration's quantity ceiling (golf: 4, one foursome). */
  maxQuantity?: number
}

export type CartEntry = PricedLine | CollectorEntry

/** Format minor units (cents) as USD. */
export function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * The answer values a collector entry holds, as a flat display list. Repeatable
 * answers collapse to one comma-joined row so a variant can render a definition
 * list without knowing the field shapes.
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
        ? raw.filter((row) => row.trim()).join(", ")
        : raw ?? ""
      return { label: field.label, value }
    })
    .filter((row) => row.value.trim().length > 0)
}

/**
 * Every named person on a registration, captain first — the compact summary
 * shown inline in the cart list.
 *
 * @param entry - The collector entry whose answers to read.
 * @returns The non-empty names, in order.
 */
export function collectorNames(entry: CollectorEntry): string[] {
  const captain = entry.answers.captain
  const golfers = Array.isArray(entry.answers.golfers)
    ? (entry.answers.golfers as string[])
    : []
  return [typeof captain === "string" ? captain : "", ...golfers].filter(
    (name) => name.trim().length > 0
  )
}

/**
 * A one-line human summary of a registration: `Jane Smith + 2 more`.
 *
 * @param entry - The collector entry whose answers to read.
 * @returns The summary string.
 */
export function collectorSummary(entry: CollectorEntry): string {
  const names = collectorNames(entry)
  if (names.length === 0) return "No players named"
  if (names.length === 1) return names[0]
  return `${names[0]} + ${names.length - 1} more`
}

/** The golf collector's field definitions, as they would be snapshotted at add-time. */
export const GOLF_FIELDS: CartField[] = [
  {
    name: "captain",
    label: "Captain",
    type: "text",
    required: true,
    placeholder: "Player 1 — the captain",
  },
  {
    name: "golfers",
    label: "Players",
    type: "text",
    repeatable: true,
    max: 3,
    placeholder: "Player name",
  },
  {
    name: "teamName",
    label: "Team name",
    type: "text",
    placeholder: "Optional",
  },
  {
    name: "email",
    label: "Email",
    type: "email",
    required: true,
    placeholder: "you@example.com",
  },
  {
    name: "shirtSize",
    label: "Shirt size",
    type: "select",
    options: ["S", "M", "L", "XL", "2XL"],
  },
]

const golfPrimary = (quantity: number): PricedLine => ({
  id: "line-golf",
  kind: "product",
  sku: "golf-outing-registration",
  label: "Golf Outing Registration",
  note: "Per golfer — 4-person scramble",
  unitAmount: 9500,
  quantity,
  quantityBearing: false,
  sourcePdp: "golf-outing-2026",
  groupRef: "golf",
})

const golfCollector = (golfers: string[]): CollectorEntry => ({
  id: "col-golf",
  kind: "collector",
  collectorRef: "golf-outing-collector",
  label: "Golf Outing — Captain & players",
  fields: GOLF_FIELDS,
  answers: {
    captain: "Jane Smith",
    golfers,
    teamName: "Forge Old Boys",
    email: "jane@example.com",
    shirtSize: "M",
  },
  sourcePdp: "golf-outing-2026",
  groupRef: "golf",
  parentId: "line-golf",
  maxQuantity: 4,
})

const mulligan = (quantity: number): PricedLine => ({
  id: "line-mulligan",
  kind: "product",
  sku: "golf-outing-mulligan",
  label: "Mulligan (4 + contest entry)",
  unitAmount: 3000,
  quantity,
  quantityBearing: true,
  sourcePdp: "golf-outing-2026",
  groupRef: "golf",
  parentId: "line-golf",
})

const drinkBand = (quantity: number): PricedLine => ({
  id: "line-drink-band",
  kind: "product",
  sku: "golf-outing-drink-band",
  label: "All You Can Drink",
  unitAmount: 3000,
  quantity,
  quantityBearing: true,
  sourcePdp: "golf-outing-2026",
  groupRef: "golf",
  parentId: "line-golf",
})

const pigRoast = (quantity: number): PricedLine => ({
  id: "line-pig-roast",
  kind: "product",
  sku: "annual-forge-pig-roast",
  label: "Pig Roast Ticket",
  note: "Per person — kids under 5 free",
  unitAmount: 2500,
  quantity,
  quantityBearing: true,
  sourcePdp: "annual-forge-pig-roast",
  groupRef: "pig-roast",
})

const dues: PricedLine = {
  id: "line-dues",
  kind: "product",
  sku: "dues-fall-2026",
  label: "2026 Fall Season Dues",
  unitAmount: 7500,
  quantity: 1,
  quantityBearing: false,
  sourcePdp: "dues",
  groupRef: "dues",
}

const donation: PricedLine = {
  id: "line-donation",
  kind: "product",
  sku: "donation-50",
  label: "Club donation",
  note: "Supports travel and equipment",
  unitAmount: 5000,
  quantity: 1,
  quantityBearing: false,
  sourcePdp: "dues",
  groupRef: "dues",
}

/** The flagship case: registration + collector answers + add-ons, plus tickets and dues. */
export const MIXED_CART: CartEntry[] = [
  golfPrimary(3),
  golfCollector(["Mike Torres", "Priya Nair"]),
  mulligan(3),
  drinkBand(1),
  pigRoast(4),
  dues,
  donation,
]

/** One registration line and its collector, nothing else. */
export const GOLF_CART: CartEntry[] = [
  golfPrimary(2),
  golfCollector(["Mike Torres"]),
  mulligan(1),
]

/** Human labels for the source PDP slugs, used to title grouped cart cards. */
const PDP_LABELS: Record<string, string> = {
  "golf-outing-2026": "Forge Golf Outing 2026",
  "annual-forge-pig-roast": "Annual Forge Pig Roast",
  dues: "Season dues & donations",
}

/**
 * The display name of the PDP an entry was added from.
 *
 * @param slug - The entry's `sourcePdp` slug.
 * @returns The matching label, or the slug itself when unmapped.
 */
export function pdpLabel(slug: string): string {
  return PDP_LABELS[slug] ?? slug
}

/** No entries — the empty state. */
export const EMPTY_CART: CartEntry[] = []

/** A plain line the mock storefront's "Add to cart" appends. */
export function pigRoastLine(quantity = 2): PricedLine {
  return pigRoast(quantity)
}
