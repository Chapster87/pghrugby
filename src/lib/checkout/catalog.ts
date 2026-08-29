/**
 * Production price catalog for the Stripe-backed store.
 *
 * The client never sends amounts or prices — it only sends selections (flow,
 * quantity, add-ons, registration payload), and the server maps those onto
 * this catalog when it builds the cart and the Checkout Session. That mirrors
 * the "cart is server-authoritative" rule from the capabilities research.
 *
 * `priceId` values are the live Stripe Prices provisioned from the live account
 * via `scripts/provision-stripe-catalog.mjs` (the source of truth is
 * `docs/agents/stripe-catalog-approval.md`). The session builder uses them when
 * `STRIPE_ENV=live`; test mode falls back to inline `price_data` using
 * `unitAmount` because a test key can't reference live Prices.
 *
 * Amounts are the smallest currency unit (cents for USD). Rates were confirmed
 * by the club in the approval doc (dues $250/$200/$100 by season, SC7s $400
 * entry / $375 additional side, golf $110/$30/$30, event tickets per WP).
 */
export const CHECKOUT_CURRENCY = "usd"

export type CatalogItem = {
  /** Stable Stripe product id / sku — the string the cart, DatoCMS, and orders key off. */
  sku: string
  label: string
  /** Minor units (cents). */
  unitAmount: number
  /** Live Stripe Price id (provisioned from the live account). */
  priceId?: string
}

export const CHECKOUT_CATALOG = {
  /** Season dues — one product per season type (fall/spring/summer), one price per season-year. */
  dues: {
    fall: {
      sku: "dues-fall",
      label: "Fall 2026 Season Dues",
      unitAmount: 25000,
      priceId: "price_1U8sVqJdsCjn0Z6oJHyBTjMy",
    } as CatalogItem,
    spring: {
      sku: "dues-spring",
      label: "Spring Season Dues",
      unitAmount: 20000,
      priceId: "price_1U8sVrJdsCjn0Z6oQAWwnxYK",
    } as CatalogItem,
    summer: {
      sku: "dues-summer",
      label: "Summer Season Dues",
      unitAmount: 10000,
      priceId: "price_1U8sVrJdsCjn0Z6oriStDeNM",
    } as CatalogItem,
  },
  /** Golf outing — registration is one line item × N golfers; add-ons are fixed prices in the same session. */
  golf: {
    registration: {
      sku: "golf-outing-registration",
      label: "Golf Outing Registration",
      unitAmount: 11000,
      priceId: "price_1U8sVrJdsCjn0Z6ortmo6EeT",
    } as CatalogItem,
    mulligan: {
      sku: "golf-outing-mulligan",
      label: "Golf Outing — Mulligan (4 + contest entry)",
      unitAmount: 3000,
      priceId: "price_1U8sVsJdsCjn0Z6oKSgm4FJK",
    } as CatalogItem,
    drinkBand: {
      sku: "golf-outing-drink-band",
      label: "Golf Outing — All You Can Drink",
      unitAmount: 3000,
      priceId: "price_1U8sVsJdsCjn0Z6o2XD2kc0Q",
    } as CatalogItem,
  },
  /** Tournament divisions — one line item, quantity 1 per team per division. */
  tournament: {
    divisions: [
      {
        sku: "sc7s-mens-open",
        label: "SC7s Men's Open",
        unitAmount: 40000,
        priceId: "price_1U8sVtJdsCjn0Z6oYrRWlKgw",
      },
      {
        sku: "sc7s-mens-social",
        label: "SC7s Men's Social",
        unitAmount: 40000,
        priceId: "price_1U8sVtJdsCjn0Z6oY5gGSuSX",
      },
      {
        sku: "sc7s-mens-super-social",
        label: "SC7s Men's Super Social",
        unitAmount: 40000,
        priceId: "price_1U8sVtJdsCjn0Z6oxmeHyQ78",
      },
      {
        sku: "sc7s-womens-open",
        label: "SC7s Women's Open",
        unitAmount: 40000,
        priceId: "price_1U8sVuJdsCjn0Z6o04LP4emq",
      },
      {
        sku: "sc7s-womens-social",
        label: "SC7s Women's Social",
        unitAmount: 40000,
        priceId: "price_1U8sVuJdsCjn0Z6o0n7Bd6xJ",
      },
      {
        sku: "sc7s-mens-additional-side",
        label: "SC7s Men's Additional Side",
        unitAmount: 37500,
        priceId: "price_1U8sVvJdsCjn0Z6oWBP498re",
      },
      {
        sku: "sc7s-womens-additional-side",
        label: "SC7s Women's Additional Side",
        unitAmount: 37500,
        priceId: "price_1U8sVvJdsCjn0Z6oKdrWG5XP",
      },
    ] satisfies CatalogItem[],
  },
  /** Fixed-amount donation presets — bundleable with any flow. A true pay-what-you-want amount is sole-line-item only (its own ticket). */
  donationPresets: [
    {
      sku: "donation-club-preset-10",
      label: "Club donation — $10",
      unitAmount: 1000,
      priceId: "price_1U8sVvJdsCjn0Z6oaOEq0ddc",
    },
    {
      sku: "donation-club-preset-25",
      label: "Club donation — $25",
      unitAmount: 2500,
      priceId: "price_1U8sVwJdsCjn0Z6oamLaukPr",
    },
    {
      sku: "donation-club-preset-50",
      label: "Club donation — $50",
      unitAmount: 5000,
      priceId: "price_1U8sVwJdsCjn0Z6oKlpr8BCC",
    },
    {
      sku: "donation-pass-the-hat",
      label: "Pass the Hat Fund — $1",
      unitAmount: 100,
      priceId: "price_1U8sVwJdsCjn0Z6o0mwJoMle",
    },
  ] satisfies CatalogItem[],
  /**
   * One-off event tickets (added per club request) — not yet wired into any
   * cart flow; the storefront/product tickets will consume them.
   */
  events: [
    {
      sku: "ballpark-day-adult",
      label: "Forge Day at the Ballpark — Adult",
      unitAmount: 4000,
      priceId: "price_1U8sVxJdsCjn0Z6o14Lb8pU7",
    },
    {
      sku: "ballpark-ticket-16-under",
      label: "Forge Day at the Ballpark — 16 & Under",
      unitAmount: 3500,
      priceId: "price_1U8sVxJdsCjn0Z6opcxFjiBL",
    },
    {
      sku: "nfl-survivor-pool-ticket",
      label: "NFL Survivor Pool — Ticket",
      unitAmount: 2000,
      priceId: "price_1U8sVxJdsCjn0Z6oWzDUHuiW",
    },
    {
      sku: "nfl-survivor-pool-insurance",
      label: "NFL Survivor Pool — Insurance",
      unitAmount: 1000,
      priceId: "price_1U8sVyJdsCjn0Z6oaAnT6j1D",
    },
    {
      sku: "steel-city-7s-bar-crawl",
      label: "Steel City 7s Bar Crawl",
      unitAmount: 500,
      priceId: "price_1U8sVyJdsCjn0Z6oz3Atw4A2",
    },
    {
      sku: "annual-forge-pig-roast",
      label: "Annual Forge Pig Roast Ticket",
      unitAmount: 2500,
      priceId: "price_1U8sVzJdsCjn0Z6olKK20EeQ",
    },
  ] satisfies CatalogItem[],
} as const

/** Max golfers the cart form allows (keeps the payload bounded). */
export const CHECKOUT_MAX_GOLFERS = 8

/** Look up a catalog item by sku across every flow. */
export function findCatalogItem(sku: string): CatalogItem | undefined {
  for (const item of Object.values(CHECKOUT_CATALOG.dues)) {
    if (item.sku === sku) return item
  }
  for (const item of Object.values(CHECKOUT_CATALOG.golf)) {
    if (item.sku === sku) return item
  }
  for (const item of CHECKOUT_CATALOG.tournament.divisions) {
    if (item.sku === sku) return item
  }
  for (const item of CHECKOUT_CATALOG.donationPresets) {
    if (item.sku === sku) return item
  }
  for (const item of CHECKOUT_CATALOG.events) {
    if (item.sku === sku) return item
  }
  return undefined
}

/**
 * Catalog items selectable for a product record's sku. Exact match wins; when
 * a product has no direct sku (e.g. `donation-club` — a Stripe product with
 * several prices), returns every catalog item whose sku starts with
 * `<sku>-` (the preset variants). Empty when the product isn't sellable yet.
 */
export function findCatalogItemsForProduct(sku: string): CatalogItem[] {
  const exact = findCatalogItem(sku)
  if (exact) return [exact]
  const flat = [
    ...Object.values(CHECKOUT_CATALOG.dues),
    ...Object.values(CHECKOUT_CATALOG.golf),
    ...CHECKOUT_CATALOG.tournament.divisions,
    ...CHECKOUT_CATALOG.donationPresets,
    ...CHECKOUT_CATALOG.events,
  ]
  return flat.filter((item) => item.sku.startsWith(`${sku}-`))
}
