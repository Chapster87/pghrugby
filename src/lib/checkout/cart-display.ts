/**
 * Display helpers for cart surfaces — formatting and label lookup, shared by
 * the flyout, the PDP, and the order summary.
 *
 * Labels resolve through the checkout catalog (`sku → label`), the same map the
 * server bills from, so a line's name never drifts from what is charged. A sku
 * the catalog no longer knows falls back to the raw sku rather than rendering
 * an empty row.
 *
 * Amounts follow the same rule with one addition: the catalog holds the
 * *regular* amount, while a sale amount lives in Stripe. `LineDisplay` carries
 * both, so a surface can show a sale without knowing where either came from.
 */

import { findCatalogItem } from "./catalog"

/** Formats minor units (cents) as USD, e.g. `$25.00`. */
export function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * A line's display name.
 *
 * @param sku - The priced line's sku.
 * @returns The catalog label, or the sku itself when unmapped.
 */
export function lineLabel(sku: string): string {
  return findCatalogItem(sku)?.label ?? sku
}

/**
 * What a line displays: the amount the buyer pays, and the regular amount to
 * strike through behind it when a sale is running.
 *
 * Resolved server-side (`src/lib/checkout/price-display.ts`) — the sale amount
 * lives in Stripe, not in the catalog — and sent to the browser through
 * `POST /api/checkout/pricing` for the flyout. Display only: the session bills
 * the Price id the server resolved, never this.
 */
export type LineDisplay = {
  /** The amount to show and charge: the sale amount while a sale runs. */
  unitAmount: number
  /** The regular amount to strike through; null when nothing is on sale. */
  compareAtAmount: number | null
}

/**
 * A sku's display pricing, falling back to the catalog's regular amount.
 *
 * The fallback is what makes an unresolved sku safe: before any resolution lands
 * — and for any sku the server could not price — the surface shows exactly what
 * it showed before sales existed.
 *
 * @param sku - The priced line's sku.
 * @param display - The resolved display pricing, keyed by sku.
 * @returns The line's display pricing.
 */
export function displayFor(
  sku: string,
  display: Record<string, LineDisplay>
): LineDisplay {
  return (
    display[sku] ?? { unitAmount: lineUnitAmount(sku), compareAtAmount: null }
  )
}

/**
 * A line's unit amount in minor units (cents), or 0 when the sku is no longer
 * in the catalog. The server re-resolves every amount at session build, so this
 * is display only.
 *
 * @param sku - The priced line's sku.
 * @returns The catalog unit amount, or 0 when unmapped.
 */
export function lineUnitAmount(sku: string): number {
  return findCatalogItem(sku)?.unitAmount ?? 0
}

/**
 * The display name of the PDP an entry was added from. The cart carries only
 * the slug (a reporting tag), so the card header title-cases it rather than
 * importing the build-time storefront manifest, which is not runtime config.
 *
 * @param slug - The entry's `sourcePdp` slug.
 * @returns The title-cased slug, e.g. `annual-forge-pig-roast` → `Annual Forge
 *   Pig Roast`.
 */
export function pdpLabel(slug: string): string {
  if (!slug) return "Your cart"
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}
