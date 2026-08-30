import { buildClient } from "@datocms/cma-client-node"
import dotenv from "dotenv"
import path from "path"

// Load from project root
dotenv.config({ path: path.resolve(process.cwd(), "../../.env.local") })

const DATOCMS_API_TOKEN =
  process.env.DATACMA_FULL_API_TOKEN || process.env.DATOCMS_API_TOKEN
const DATOCMS_ENVIRONMENT = process.env.DATOCMS_ENVIRONMENT || "main"

if (!DATOCMS_API_TOKEN) {
  console.error("DATOCMS_API_TOKEN missing.")
  process.exit(1)
}

const client = buildClient({
  apiToken: DATOCMS_API_TOKEN,
  environment: DATOCMS_ENVIRONMENT,
})

const PRODUCT_MODEL_ID = "LACQ-eAJQjSix9bWWrgdUQ" // api_key: product
const PDP_MODEL_ID = "InXj3XuhRNSp5BIsjepR_A" // api_key: product_detail_page

/**
 * Editorial copy for products WooCommerce never described (dues seasons, SC7s
 * divisions + sides). Rates are the club-approved catalog
 * (docs/agents/stripe-catalog-approval.md): dues $250/$200/$100 by season,
 * SC7s $400 entry / $375 additional side. Only empty fields are filled —
 * existing copy (e.g. the golf/donation records) is never overwritten.
 * Cloudinary media is linked by the owner in DatoCMS.
 */
const PRODUCT_COPY = {
  "dues-fall": {
    short_description:
      "Fall 2026 season dues — $250 per player. Pay securely online.",
    long_description:
      "Dues are set by the club and cover the costs of running the team through the fall season. Pay your Fall 2026 dues here with Stripe.",
  },
  "dues-spring": {
    short_description:
      "Spring season dues — $200 per player. Pay securely online.",
    long_description:
      "Dues are set by the club and cover the costs of running the team through the spring season. Pay your spring dues here with Stripe.",
  },
  "dues-summer": {
    short_description:
      "Summer season dues — $100 per player. Pay securely online.",
    long_description:
      "Dues are set by the club and cover the costs of running the team through the summer season. Pay your summer dues here with Stripe.",
  },
  "sc7s-mens-open": {
    short_description: "Steel City 7s — Men's Open division entry. $400 per team.",
    long_description:
      "Register your side for the Men's Open division of Steel City 7s, the Pittsburgh Forge annual 7s tournament. Entry is $400 per team.",
  },
  "sc7s-mens-social": {
    short_description:
      "Steel City 7s — Men's Social division entry. $400 per team.",
    long_description:
      "Register your side for the Men's Social division of Steel City 7s, the Pittsburgh Forge annual 7s tournament. Entry is $400 per team.",
  },
  "sc7s-mens-super-social": {
    short_description:
      "Steel City 7s — Men's Super Social division entry. $400 per team.",
    long_description:
      "Register your side for the Men's Super Social division of Steel City 7s, the Pittsburgh Forge annual 7s tournament. Entry is $400 per team.",
  },
  "sc7s-womens-open": {
    short_description:
      "Steel City 7s — Women's Open division entry. $400 per team.",
    long_description:
      "Register your side for the Women's Open division of Steel City 7s, the Pittsburgh Forge annual 7s tournament. Entry is $400 per team.",
  },
  "sc7s-womens-social": {
    short_description:
      "Steel City 7s — Women's Social division entry. $400 per team.",
    long_description:
      "Register your side for the Women's Social division of Steel City 7s, the Pittsburgh Forge annual 7s tournament. Entry is $400 per team.",
  },
  "sc7s-mens-additional-side": {
    short_description:
      "Add a second Men's side to your Steel City 7s entry — $375.",
    long_description:
      "Bringing more than one Men's side? Add an additional side to your Steel City 7s entry for $375.",
  },
  "sc7s-womens-additional-side": {
    short_description:
      "Add a second Women's side to your Steel City 7s entry — $375.",
    long_description:
      "Bringing more than one Women's side? Add an additional side to your Steel City 7s entry for $375.",
  },
}

/** One-line intros for the four flow pages (rendered under the PDP title). */
const PDP_DESCRIPTION = {
  dues: "Pay your Pittsburgh Forge season dues securely online. Dues are set by the club and cover the cost of playing for the season.",
  "golf-outing":
    "The Pittsburgh Forge Golf Outing returns Friday, October 2nd at Blackhawk Golf Course. $110 per golfer includes food, drink, and a cart.",
  "steel-city-7s":
    "Register your team for Steel City 7s, the Pittsburgh Forge annual 7s tournament. Pick a division below and add sides as needed.",
  donate:
    "Support the Pittsburgh Forge Rugby Club — a registered 501(c)(3) nonprofit, so some donations may be tax deductible. Thank you for helping us grow rugby in the Steel City.",
}

async function fillProducts() {
  const items = await client.items.list({
    "filter[type]": PRODUCT_MODEL_ID,
    "page[limit]": 100,
  })
  const bySku = new Map(items.map((p) => [p.sku, p]))
  let filled = 0

  for (const [sku, copy] of Object.entries(PRODUCT_COPY)) {
    const record = bySku.get(sku)
    if (!record) {
      console.warn(`  [skip] no product record for sku "${sku}"`)
      continue
    }
    const payload = {}
    for (const [field, value] of Object.entries(copy)) {
      if (!record[field]) payload[field] = value
    }
    if (Object.keys(payload).length === 0) {
      console.log(`  [ok]   ${sku} — copy already present`)
      continue
    }
    await client.items.update(record.id, payload)
    await client.items.publish(record.id)
    filled++
    console.log(
      `  [fill] ${sku} — ${Object.keys(payload).join(", ")}`
    )
  }
  return filled
}

async function fillPdpDescriptions() {
  const pdps = await client.items.list({
    "filter[type]": PDP_MODEL_ID,
    "page[limit]": 100,
  })
  const bySlug = new Map(pdps.map((p) => [p.slug, p]))
  let filled = 0

  for (const [slug, description] of Object.entries(PDP_DESCRIPTION)) {
    const record = bySlug.get(slug)
    if (!record) {
      console.warn(`  [skip] no PDP record for slug "${slug}"`)
      continue
    }
    if (record.description) {
      console.log(`  [ok]   ${slug} — description already present`)
      continue
    }
    await client.items.update(record.id, { description })
    await client.items.publish(record.id)
    filled++
    console.log(`  [fill] ${slug} — description`)
  }
  return filled
}

async function main() {
  console.log("Filling editorial copy (empty fields only)...")
  const productsFilled = await fillProducts()
  const pdpsFilled = await fillPdpDescriptions()
  console.log(
    `\nDone — ${productsFilled} product records + ${pdpsFilled} PDP descriptions filled.`
  )
}

main().catch(console.error)
