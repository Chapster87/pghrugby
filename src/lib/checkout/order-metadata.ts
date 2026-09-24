/**
 * The Stripe metadata the session build writes — `families`, `reg_N`,
 * `reg_count`, `reg_ref` — and the compact registration summaries that ride in
 * it.
 *
 * Pure, like `order-rows.ts`: the session route and the scripted round-trips
 * share one implementation, and the values can be asserted without Stripe.
 *
 * Authority: `docs/agents/order-records-and-reporting.md` § 4 and
 * `docs/pdp-to-minicart-to-checkout-spec.md` § 8.5, with the limits and the
 * summary scheme pinned by
 * `docs/agents/stripe-checkout-registration-metadata.md`: 50 keys per object,
 * values ≤ 500 chars, no `[`/`]` in keys.
 *
 * `families` is read from the code catalog rather than Stripe: the metadata must
 * be identical whichever Stripe account the session is built against, and in
 * test mode the live Price ids don't exist to expand into a Product — so a
 * Stripe read would leave the local (criterion-carrying) checkout with no
 * families at all. `catalog.ts` mirrors the provisioned `family` metadata.
 */

import {
  isCollectorEntry,
  pricedLines,
  type CartEntry,
  type CollectorEntry,
  type PricedLine,
} from "./cart-entries"
import { findCatalogItem } from "./catalog"

/** Stripe's per-object cap. Sessions and PaymentIntents each get their own. */
export const METADATA_KEY_LIMIT = 50

/** Stripe's per-value cap, in characters. */
export const METADATA_VALUE_LIMIT = 500

/**
 * The distinct `family` values the cart's priced lines touch, in cart order.
 *
 * @param entries - The cart's entries, in add order.
 * @returns The families; `[]` when no line carries one.
 */
export function deriveLineFamilies(entries: CartEntry[]): string[] {
  const families: string[] = []
  for (const line of pricedLines(entries)) {
    const family = findCatalogItem(line.sku)?.family
    if (family && !families.includes(family)) families.push(family)
  }
  return families
}

/**
 * The registrant names a collector entry holds, in the field order the buyer
 * filled: every answered field, repeatable values flattened, blanks dropped.
 *
 * Read from the entry's own field snapshot rather than any collector definition
 * fetched now, so the summary describes the form the buyer actually submitted
 * (`docs/agents/registration-editing.md` § 7).
 *
 * @param collector - The collector entry to read.
 * @returns One string per answered value; `[]` when nothing was answered.
 */
export function registrationNames(collector: CollectorEntry): string[] {
  const names: string[] = []
  for (const field of collector.fields) {
    const raw = collector.answers[field.name]
    const values = Array.isArray(raw) ? raw : [raw]
    for (const value of values) {
      const name = answerLabel(value)
      if (name) names.push(name)
    }
  }
  return names
}

/**
 * Reads one answer as a display string: a scalar, or a `{ name, email }` person.
 *
 * @param value - The raw answer value.
 * @returns The display string, or null when the answer is blank or unusable.
 */
function answerLabel(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null
  if (typeof value === "number") return String(value)
  if (value && typeof value === "object") {
    const person = value as { name?: unknown; email?: unknown }
    const name = typeof person.name === "string" ? person.name.trim() : ""
    const email = typeof person.email === "string" ? person.email.trim() : ""
    if (name && email) return `${name} · ${email}`
    return name || email || null
  }
  return null
}

/**
 * The compact `reg_N` string for one line: `"Golf Outing Registration x4: Jane
 * Smith, John Doe"`.
 *
 * Never exceeds `METADATA_VALUE_LIMIT`: entries are added while they fit and the
 * remainder is replaced by a `… +N more` marker — the untruncated payload lives
 * in `order_registrations.answers`, reached through `reg_ref`.
 *
 * @param label - The line's catalog label.
 * @param quantity - The line's buyer-set quantity.
 * @param names - The registrant names; empty for an unanswered registration.
 * @returns The capped summary string.
 */
export function summariseLine(
  label: string,
  quantity: number,
  names: string[]
): string {
  const head = `${label} x${quantity}`
  if (names.length === 0) return head

  const build = (kept: string[], dropped: number) =>
    `${head}: ${kept.join(", ")}${dropped > 0 ? `, … +${dropped} more` : ""}`

  const full = build(names, 0)
  if (full.length <= METADATA_VALUE_LIMIT) return full

  const kept: string[] = []
  for (const name of names) {
    const dropped = names.length - kept.length - 1
    if (build([...kept, name], dropped).length > METADATA_VALUE_LIMIT) break
    kept.push(name)
  }

  if (kept.length === 0) {
    // A single over-long entry: the header alone, still bounded.
    return head.length <= METADATA_VALUE_LIMIT
      ? head
      : `${head.slice(0, METADATA_VALUE_LIMIT - 1)}…`
  }
  return build(kept, names.length - kept.length)
}

/** The `reg_N` summaries plus the order's registration count. */
export type RegistrationSummaries = {
  /** `reg_N` per 0-based priced-line index; a line with no registration has none. */
  byLineIndex: Record<number, string>
  /** The order's registration count — one per collector entry, never per line. */
  count: number
}

/**
 * Builds the per-line registration summaries.
 *
 * A line's registrants are its own collector entry, or — on an add-on — its
 * primary's, inherited through `parentId` and rendered under the add-on's own
 * label and quantity. A line with no primary (dues, a donation) gets none.
 * `count` counts **registrations**, not lines, so an add-on inheriting its
 * primary's roster does not inflate it.
 *
 * @param entries - The cart's entries, in add order.
 * @returns The summaries keyed by line index, and the registration count.
 */
export function buildRegistrationSummaries(
  entries: CartEntry[]
): RegistrationSummaries {
  const lines = pricedLines(entries)
  const collectors = entries.filter(isCollectorEntry)
  const byLineIndex: Record<number, string> = {}

  lines.forEach((line, lineIndex) => {
    const collector = registrationFor(line, lines, collectors)
    if (!collector) return
    // The label is the line's own in every case: an add-on inherits the names,
    // not the primary's name (`docs/agents/order-records-and-reporting.md` § 4).
    const label = findCatalogItem(line.sku)?.label ?? line.sku
    byLineIndex[lineIndex] = summariseLine(
      label,
      line.quantity,
      registrationNames(collector)
    )
  })

  const count = collectors.filter((collector) =>
    lines.some((line) => line.id === collector.parentId)
  ).length

  return { byLineIndex, count }
}

/** The collector entry a line's registrants ride on: its own, or its primary's. */
function registrationFor(
  line: PricedLine,
  lines: PricedLine[],
  collectors: CollectorEntry[]
): CollectorEntry | undefined {
  const own = collectors.find((collector) => collector.parentId === line.id)
  if (own) return own
  if (!line.parentId) return undefined
  return collectors.find((collector) => collector.parentId === line.parentId)
}

/**
 * The metadata the session build writes to the Checkout Session **and** the
 * PaymentIntent (the Dashboard payment page is the PaymentIntent).
 */
export type OrderMetadataPlan = {
  /** Session + `payment_intent_data` metadata (≤ `METADATA_KEY_LIMIT` keys). */
  metadata: Record<string, string>
  /**
   * The `reg_N` keys that no longer fit the session budget, keyed by cart line
   * index — written onto that line item's own metadata instead (`§ 8.5`'s
   * >50-line overflow).
   */
  lineMetadata: Record<number, Record<string, string>>
}

/**
 * Builds the session's metadata: `families`, `reg_count`, `reg_ref`, then one
 * `reg_N` per registration-bearing line, in line order.
 *
 * @param entries - The cart's entries, in add order.
 * @param cartRef - The `client_reference_id` the order is traced back by.
 * @returns The session metadata and any per-line overflow.
 */
export function buildOrderMetadata(
  entries: CartEntry[],
  cartRef: string
): OrderMetadataPlan {
  const families = deriveLineFamilies(entries)
  const { byLineIndex, count } = buildRegistrationSummaries(entries)

  const metadata: Record<string, string> = {}
  metadata.families = families.join(",")
  metadata.reg_count = String(count)
  metadata.reg_ref = cartRef

  const lineMetadata: Record<number, Record<string, string>> = {}
  for (const [index, summary] of Object.entries(byLineIndex)) {
    const key = `reg_${index}`
    if (Object.keys(metadata).length < METADATA_KEY_LIMIT) {
      metadata[key] = summary
    } else {
      lineMetadata[Number(index)] = { [key]: summary }
    }
  }

  return { metadata, lineMetadata }
}
