/**
 * Production price catalog for the Stripe-backed store.
 *
 * The client never sends amounts or prices — it only sends selections (flow,
 * quantity, add-ons, registration payload), and the server maps those onto
 * this catalog when it builds the cart and the Checkout Session. That mirrors
 * the "cart is server-authoritative" rule from the capabilities research.
 *
 * Amounts are the smallest currency unit (cents for USD). Rates default to the
 * live-site prices captured in `docs/agents/stripe-catalog-spec.md` §1; they
 * are club operational calls to confirm before go-live.
 *
 * @TODO: Provision the Stripe catalog (products + prices) from the live
 * account per `docs/agents/stripe-catalog-spec.md` §2 and fill each item's
 * `priceId`. Until then the session builder falls back to inline `price_data`
 * using `unitAmount`, which keeps test mode working end-to-end.
 */
export const CHECKOUT_CURRENCY = "usd"

export type CatalogItem = {
  /** Stable Stripe product id / sku — the string the cart, DatoCMS, and orders key off. */
  sku: string
  label: string
  /** Minor units (cents). */
  unitAmount: number
  /** Live Stripe Price id once the catalog is provisioned; empty in test mode. */
  priceId?: string
}

export const CHECKOUT_CATALOG = {
  /** Season dues — fixed price, quantity 1. */
  dues: {
    sku: "dues-fall",
    label: "Fall 2026 Season Dues",
    unitAmount: 20000,
  } as CatalogItem,
  /** Golf outing — registration is one line item × N golfers; add-ons are fixed prices in the same session. */
  golf: {
    registration: {
      sku: "golf-outing-registration",
      label: "Golf Outing Registration",
      unitAmount: 11000,
    } as CatalogItem,
    mulligan: {
      sku: "golf-outing-mulligan",
      label: "Golf Outing — Mulligan (4 + contest entry)",
      unitAmount: 3000,
    } as CatalogItem,
    drinkBand: {
      sku: "golf-outing-drink-band",
      label: "Golf Outing — All You Can Drink",
      unitAmount: 3000,
    } as CatalogItem,
  },
  /** Tournament divisions — one line item, quantity 1 per team per division. */
  tournament: {
    divisions: [
      { sku: "sc7s-mens-open", label: "SC7s Men's Open", unitAmount: 35000 },
      {
        sku: "sc7s-mens-social",
        label: "SC7s Men's Social",
        unitAmount: 35000,
      },
      {
        sku: "sc7s-mens-super-social",
        label: "SC7s Men's Super Social",
        unitAmount: 35000,
      },
      { sku: "sc7s-womens-open", label: "SC7s Women's Open", unitAmount: 35000 },
      {
        sku: "sc7s-mens-additional-side",
        label: "SC7s Men's Additional Side",
        unitAmount: 32500,
      },
      {
        sku: "sc7s-womens-additional-side",
        label: "SC7s Women's Additional Side",
        unitAmount: 32500,
      },
    ] satisfies CatalogItem[],
  },
  /** Fixed-amount donation presets — bundleable with any flow. A true pay-what-you-want amount is sole-line-item only (its own ticket). */
  donationPresets: [
    {
      sku: "donation-club-preset-10",
      label: "Club donation — $10",
      unitAmount: 1000,
    },
    {
      sku: "donation-club-preset-25",
      label: "Club donation — $25",
      unitAmount: 2500,
    },
    {
      sku: "donation-club-preset-50",
      label: "Club donation — $50",
      unitAmount: 5000,
    },
  ] satisfies CatalogItem[],
} as const

/** Max golfers the cart form allows (keeps the payload bounded). */
export const CHECKOUT_MAX_GOLFERS = 8

/** Look up a catalog item by sku across every flow. */
export function findCatalogItem(sku: string): CatalogItem | undefined {
  if (CHECKOUT_CATALOG.dues.sku === sku) return CHECKOUT_CATALOG.dues
  for (const item of Object.values(CHECKOUT_CATALOG.golf)) {
    if (item.sku === sku) return item
  }
  for (const item of CHECKOUT_CATALOG.tournament.divisions) {
    if (item.sku === sku) return item
  }
  for (const item of CHECKOUT_CATALOG.donationPresets) {
    if (item.sku === sku) return item
  }
  return undefined
}
