/**
 * PROTOTYPE — synthetic PDP fixtures for the layout prototype retained from
 * wayfinder ticket #62. Not wired to DatoCMS, Stripe, or the cart API, and not
 * meant to be promoted as-is.
 *
 * The shapes mirror the decided product model (`docs/agents/pdp-product-model.md`):
 * `product_type` governs primary selection, `quantity_bearing` is per product,
 * `in_stock` disables (never hides) a line, and `compareAtAmount` stands in for a
 * resolved sale price (`docs/agents/pdp-pricing-and-sale-windows.md`).
 */

/** A page-owned gallery item. Placeholder media stands in for a Cloudinary image. */
export type PdpPhoto = {
  id: string
  alt: string
}

/** One buyable line: a primary or an add-on. */
export type PdpLine = {
  /** Stripe sku the line would key off. */
  id: string
  label: string
  note?: string
  /** Effective price, minor units (cents). */
  unitAmount: number
  /** Regular price when a sale is active, minor units (cents). */
  compareAtAmount?: number
  /** Renders a quantity stepper wherever the line appears. */
  quantityBearing: boolean
  /** Sold-out lines render disabled and labelled, never hidden. */
  inStock: boolean
}

/** A DataCollector form field. */
export type PdpField = {
  name: string
  label: string
  type: "text" | "email" | "select"
  required?: boolean
  repeatable?: boolean
  max?: number
  options?: string[]
  placeholder?: string
}

/** One full PDP under test. */
export type PdpFixture = {
  slug: string
  /** Short label for the fixture toggle. */
  shortLabel: string
  title: string
  /** One-liner shown under the title in the buy box. */
  shortDescription: string
  /** Event meta (date/location) shown under the short description. */
  tagline: string
  /** Long copy, shown in the bottom Description tab. */
  description: string
  /** Bulleted "what you get", shown in the bottom Includes tab. */
  includes: string[]
  /** Practical notes, shown in the bottom Good to know tab. */
  goodToKnow: string
  productType: "simple" | "variation" | "grouped"
  photos: PdpPhoto[]
  primaries: PdpLine[]
  addons: PdpLine[]
  fields: PdpField[]
}

const photo = (id: string, alt: string): PdpPhoto => ({ id, alt })

/** The flagship case: one registration primary, quantity-bearing add-ons, a DataCollector. */
const golf: PdpFixture = {
  slug: "golf-outing-2026",
  shortLabel: "Golf outing",
  title: "Forge Golf Outing 2026",
  shortDescription:
    "A four-person scramble, dinner, and the raffle that always gets out of hand.",
  tagline: "Friday, October 2 · Butler's Golf Course",
  description:
    "Our biggest fundraiser of the year. A four-person scramble with on-course contests, dinner, and the raffle that always gets out of hand. Every dollar goes to the club's travel and equipment fund.",
  includes: [
    "18 holes, four-person scramble",
    "Cart and green fees",
    "Dinner and awards",
    "Two drink tickets",
  ],
  goodToKnow:
    "Check-in opens at 9am with a 10am shotgun start. Mulligans and drink bands can be added above, and hole sponsorships include a tee sign.",
  productType: "simple",
  photos: [
    photo("golf-1", "Foursome teeing off"),
    photo("golf-2", "The 18th green at sunset"),
    photo("golf-3", "Players at the drink cart"),
    photo("golf-4", "Dinner and raffle tables"),
  ],
  primaries: [
    {
      id: "golf-outing-registration",
      label: "Golf Outing Registration",
      note: "Per golfer — 4-person scramble",
      unitAmount: 9500,
      compareAtAmount: 11000,
      quantityBearing: false,
      inStock: true,
    },
  ],
  addons: [
    {
      id: "golf-outing-mulligan",
      label: "Mulligan (4 + contest entry)",
      unitAmount: 3000,
      quantityBearing: true,
      inStock: true,
    },
    {
      id: "golf-outing-drink-band",
      label: "All You Can Drink",
      unitAmount: 3000,
      quantityBearing: true,
      inStock: false,
    },
    {
      id: "golf-hole-sponsorship",
      label: "Hole sponsorship",
      note: "Your name on the tee sign",
      unitAmount: 15000,
      quantityBearing: false,
      inStock: true,
    },
  ],
  fields: [
    {
      name: "golfers",
      label: "Golfer names",
      type: "text",
      required: true,
      repeatable: true,
      max: 8,
      placeholder: "Golfer name",
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
  ],
}

/** The simple case: one quantity-bearing ticket, no DataCollector, no add-ons. */
const orphan: PdpFixture = {
  slug: "annual-forge-pig-roast",
  shortLabel: "Pig roast (no collector)",
  title: "Annual Forge Pig Roast",
  shortDescription:
    "Slow-roasted pig, sides, and the end-of-season awards. Tickets per person.",
  tagline: "Saturday, November 7 · Forge Clubhouse",
  description:
    "The season-closer. Slow-roasted pig, sides from the parents' group, and the end-of-year awards. Bring the family — tickets are per person.",
  includes: [
    "Slow-roasted pig and sides",
    "End-of-season awards",
    "Dessert and soft drinks",
  ],
  goodToKnow:
    "Doors at 4pm, food from 5pm. BYO chairs for the lawn, and kids under 5 eat free.",
  productType: "simple",
  photos: [
    photo("pig-1", "The roast, mid-carve"),
    photo("pig-2", "Tables on the clubhouse lawn"),
    photo("pig-3", "Awards under the tent"),
  ],
  primaries: [
    {
      id: "annual-forge-pig-roast",
      label: "Pig Roast Ticket",
      note: "Per person — kids under 5 free",
      unitAmount: 2500,
      quantityBearing: true,
      inStock: true,
    },
  ],
  addons: [],
  fields: [],
}

/** Extra fixture so the multi-primary (variation) path is visible. */
const sc7s: PdpFixture = {
  slug: "steel-city-7s-2026",
  shortLabel: "Steel City 7s (variation)",
  title: "Steel City 7s 2026",
  shortDescription:
    "Two days, five divisions, one of the best social tournaments on the East Coast.",
  tagline: "July 18–19 · Founder's Field",
  description:
    "Two days, five divisions, one of the best social tournaments on the East Coast. Pick your division below — each team registers once.",
  includes: [
    "Two-day tournament entry",
    "Referee fees",
    "Tournament shirt per player",
    "Saturday night social",
  ],
  goodToKnow:
    "Rosters are due two weeks before kickoff. Registration covers one team — additional sides are added at checkout.",
  productType: "variation",
  photos: [
    photo("sc7s-1", "Kickoff under the lights"),
    photo("sc7s-2", "The crowd on the hill"),
    photo("sc7s-3", "Cup presentation"),
  ],
  primaries: [
    {
      id: "sc7s-mens-open",
      label: "Men's Open",
      unitAmount: 40000,
      quantityBearing: false,
      inStock: false,
    },
    {
      id: "sc7s-mens-social",
      label: "Men's Social",
      unitAmount: 40000,
      quantityBearing: false,
      inStock: true,
    },
    {
      id: "sc7s-mens-super-social",
      label: "Men's Super Social",
      unitAmount: 40000,
      quantityBearing: false,
      inStock: true,
    },
    {
      id: "sc7s-womens-open",
      label: "Women's Open",
      unitAmount: 40000,
      quantityBearing: false,
      inStock: true,
    },
    {
      id: "sc7s-womens-social",
      label: "Women's Social",
      unitAmount: 40000,
      quantityBearing: false,
      inStock: true,
    },
  ],
  addons: [],
  fields: [
    {
      name: "teamName",
      label: "Team name",
      type: "text",
      required: true,
      placeholder: "e.g. Forge Old Boys",
    },
    { name: "email", label: "Email", type: "email", required: true },
  ],
}

export const FIXTURES: PdpFixture[] = [golf, orphan, sc7s]

/**
 * Resolve a fixture by its slug.
 *
 * @param slug - The fixture's `slug` (its `product` search-param value).
 * @returns The matching fixture, or `undefined` when none matches.
 */
export function fixtureBySlug(slug: string): PdpFixture | undefined {
  return FIXTURES.find((fixture) => fixture.slug === slug)
}

/** Format minor units (cents) as USD. */
export function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}
