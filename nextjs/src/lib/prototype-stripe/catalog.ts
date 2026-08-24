/**
 * PROTOTYPE — server-authoritative price catalog for the wayfinder spike.
 *
 * Amounts are in the smallest currency unit (cents for USD). The client never
 * sends amounts or prices; it only sends selections (flow, quantity, donation
 * preset index, golfers), and the server maps those onto this catalog when it
 * builds the Checkout Session. That mirrors the "cart is server-authoritative"
 * rule from the capabilities research.
 *
 * These are placeholder amounts — the real build uses Stripe Prices (price IDs)
 * from the live account.
 */
export const PROTOTYPE_CURRENCY = "usd"

export const PROTOTYPE_CATALOG = {
  /** Season dues — fixed price, quantity 1 in this spike. */
  dues: {
    label: "Fall 2026 Season Dues",
    unitAmount: 7500,
  },
  /**
   * Fixed-amount donation presets. A true pay-what-you-want donation
   * (custom_unit_amount) can never share a session with other line items, so
   * the dues session only supports fixed presets. The PWYW donation UX is its
   * own graduated wayfinder ticket (Grilling: Pay-what-you-want donation UX).
   */
  donationPresets: [
    { label: "Club donation — $10", unitAmount: 1000 },
    { label: "Club donation — $25", unitAmount: 2500 },
    { label: "Club donation — $50", unitAmount: 5000 },
  ],
  /** Golf outing registration — quantity is the number of golfers. */
  golf: {
    label: "Golf Outing Registration",
    unitAmount: 10000,
  },
} as const

/** Max golfers the stub form allows (keeps the spike form small). */
export const PROTOTYPE_MAX_GOLFERS = 8
