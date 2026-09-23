/**
 * Display helpers for cart surfaces — formatting and label lookup, shared by
 * the flyout, the PDP, and the order summary.
 *
 * Labels resolve through the checkout catalog (`sku → label`), the same map the
 * server bills from, so a line's name never drifts from what is charged. A sku
 * the catalog no longer knows falls back to the raw sku rather than rendering
 * an empty row.
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
