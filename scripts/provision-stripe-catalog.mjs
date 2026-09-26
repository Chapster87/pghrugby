#!/usr/bin/env node
/**
 * Provision the Stripe store catalog (products, prices, coupons, promotion
 * codes) on the LIVE account from the approval checklist in
 * `docs/agents/stripe-catalog-approval.md`.
 *
 * Only rows checked `[x]` in the checklist are created. Rows sharing a Product
 * ID create one product (metadata from the first checked row) plus one price
 * each. A checked coupon block creates one coupon, with an optional
 * `- promotion_code:` line creating a customer-facing code on top of it; the
 * coupon's `applies_to` is derived from the checked `family=tournament`
 * products. Idempotent: existing products (by id), prices (by lookup_key),
 * coupons (by id) and promotion codes (by code) are reused, never duplicated.
 *
 * A price row is either a fixed `- price: N.NN, lookup_key: `key`` or a
 * customer-entered `- custom_unit_amount: preset=N.NN, minimum=N.NN,
 * maximum=N.NN, lookup_key: `key`` (the pay-what-you-want donation). The two are
 * mutually exclusive per Stripe's Price model.
 *
 * It creates and never retires: archiving the products a decision drops stays a
 * deliberate, separate act (see the retirement note in the checklist).
 *
 * Usage (from the repo root):
 *   pnpm provision:stripe            # dry-run: planned catalog + live diff, no writes
 *   pnpm provision:stripe:apply      # create exactly the [x] rows + print price map
 *
 * Reads STRIPE_SECRET_KEY_LIVE from `.env.local`.
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import Stripe from "stripe"

const APPLY = process.argv.includes("--apply")

const APPROVAL_DOC = resolve(
  import.meta.dirname,
  "../docs/agents/stripe-catalog-approval.md"
)
const ENV_LOCAL = resolve(import.meta.dirname, "../.env.local")

// --- env ---------------------------------------------------------------------
function loadEnvLocal() {
  const env = {}
  for (const rawLine of readFileSync(ENV_LOCAL, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    const value = line
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "")
    if (!(key in env)) env[key] = value
  }
  return env
}

const secretKey = loadEnvLocal().STRIPE_SECRET_KEY_LIVE
if (!secretKey) {
  console.error(
    "STRIPE_SECRET_KEY_LIVE is not set in .env.local — add the live secret key first."
  )
  process.exit(1)
}
if (!secretKey.startsWith("sk_live_")) {
  console.error(
    "STRIPE_SECRET_KEY_LIVE does not start with sk_live_ — refusing to run against a non-live key."
  )
  process.exit(1)
}

const stripe = new Stripe(secretKey)

// --- parse the approval checklist --------------------------------------------
function parseChecklist() {
  const lines = readFileSync(APPROVAL_DOC, "utf8").split(/\r?\n/)
  const rows = []
  const coupons = []
  const skipped = []
  let current = null

  const flush = () => {
    if (!current) return

    if (current.kind === "coupon") {
      if (current.checked) coupons.push(current)
      else skipped.push(`${current.id} (coupon)`)
      current = null
      return
    }

    if (current.checked) {
      for (const p of current.prices) {
        rows.push({
          productId: current.productId,
          name: current.name,
          amountUsd: p.amountUsd,
          customUnitAmount: p.customUnitAmount,
          lookupKey: p.lookupKey,
          metadata: current.metadata,
        })
      }
    } else {
      const keys = current.prices.map((p) => p.lookupKey).join(", ")
      skipped.push(`${current.productId} (${keys})`)
    }
    current = null
  }

  for (const line of lines) {
    // "- [x] product `sku` — Name"
    const header = line.match(
      /^\s*-\s*\[([ xX])\]\s*product\s+`([^`]+)`\s*—\s*(.+)$/
    )
    if (header) {
      flush()
      current = {
        kind: "product",
        productId: header[2],
        name: header[3].trim(),
        metadata: {},
        prices: [],
        checked: header[1].toLowerCase() === "x",
      }
      continue
    }

    // "- [x] coupon `id` — $25 off the additional side"
    const couponHeader = line.match(
      /^\s*-\s*\[([ xX])\]\s*coupon\s+`([^`]+)`\s*—\s*(.+)$/
    )
    if (couponHeader) {
      flush()
      current = {
        kind: "coupon",
        id: couponHeader[2],
        name: couponHeader[3].trim(),
        amountOffUsd: null,
        promotionCode: null,
        checked: couponHeader[1].toLowerCase() === "x",
      }
      continue
    }

    if (!current) continue

    if (current.kind === "coupon") {
      // "  - amount_off: 25.00"
      const amount = line.match(/^\s*- amount_off:\s*([0-9.]+)\s*$/)
      if (amount) {
        current.amountOffUsd = parseFloat(amount[1])
        continue
      }
      // "  - promotion_code: EXTRASIDE"
      const code = line.match(/^\s*- promotion_code:\s*(\S+)\s*$/)
      if (code) current.promotionCode = code[1]
      continue
    }

    // "  - price: 200.00, lookup_key: `dues-fall-2026`"
    const price = line.match(
      /^\s*- price:\s*([0-9.]+)\s*,\s*lookup_key:\s*`([^`]+)`\s*$/
    )
    if (price) {
      current.prices.push({
        amountUsd: parseFloat(price[1]),
        customUnitAmount: null,
        lookupKey: price[2],
      })
      continue
    }

    // "  - custom_unit_amount: preset=50.00, minimum=1.00, maximum=10000.00, lookup_key: `donation-club-any`"
    const custom = line.match(
      /^\s*- custom_unit_amount:\s*preset=([0-9.]+)\s*,\s*minimum=([0-9.]+)\s*,\s*maximum=([0-9.]+)\s*,\s*lookup_key:\s*`([^`]+)`\s*$/
    )
    if (custom) {
      current.prices.push({
        amountUsd: null,
        customUnitAmount: {
          preset: parseFloat(custom[1]),
          minimum: parseFloat(custom[2]),
          maximum: parseFloat(custom[3]),
        },
        lookupKey: custom[4],
      })
      continue
    }

    // "  - metadata: family=dues, season=fall, kind=one-time"
    const meta = line.match(/^\s*- metadata:\s*(.+)$/)
    if (meta) current.metadata = parseMetadata(meta[1].trim())
  }
  flush()
  return { rows, coupons, skipped }
}

function parseMetadata(raw) {
  const metadata = {}
  for (const pair of raw.split(",")) {
    const eq = pair.indexOf("=")
    if (eq === -1) continue
    metadata[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim()
  }
  return metadata
}

/** How a price row reads in a log line: a fixed amount, or the PWYW bounds. */
function describeRow(row) {
  if (!row.customUnitAmount) return `$${row.amountUsd.toFixed(2)}`
  const { preset, minimum, maximum } = row.customUnitAmount
  return `custom $${preset.toFixed(2)} (min $${minimum.toFixed(
    2
  )}, max $${maximum.toFixed(2)})`
}

const { rows, coupons, skipped } = parseChecklist()
if (rows.length === 0 && coupons.length === 0) {
  console.error("No [x] rows found in the approval checklist — nothing to do.")
  process.exit(1)
}

// Group prices by product id (create each product once).
const byProduct = new Map()
for (const row of rows) {
  if (!byProduct.has(row.productId)) byProduct.set(row.productId, [])
  byProduct.get(row.productId).push(row)
}

// --- helpers ------------------------------------------------------------------
async function getProduct(id) {
  try {
    return await stripe.products.retrieve(id)
  } catch (error) {
    if (error instanceof Stripe.errors.StripeInvalidRequestError) return null
    throw error
  }
}

async function getPriceByLookupKey(lookupKey) {
  const { data } = await stripe.prices.list({
    lookup_keys: [lookupKey],
    limit: 1,
  })
  return data[0] ?? null
}

/** A coupon by id, or null when it does not exist yet. */
async function getCoupon(id) {
  try {
    return await stripe.coupons.retrieve(id)
  } catch (error) {
    if (error instanceof Stripe.errors.StripeInvalidRequestError) return null
    throw error
  }
}

/** An active promotion code by its customer-facing code, or null. */
async function getPromotionCode(code) {
  const { data } = await stripe.promotionCodes.list({ code, limit: 1 })
  return data[0] ?? null
}

// --- current inventory --------------------------------------------------------
console.log(
  `\n=== Live account inventory (${APPLY ? "applying" : "dry-run"}) ===`
)
const { data: liveProducts } = await stripe.products.list({
  limit: 100,
  active: true,
})
const { data: livePrices } = await stripe.prices.list({
  limit: 100,
  active: true,
})
for (const p of liveProducts) {
  const priceCount = livePrices.filter((pr) => pr.product === p.id).length
  console.log(
    `  product ${p.id} — "${p.name}" (${priceCount} price${
      priceCount === 1 ? "" : "s"
    })`
  )
}
for (const pr of livePrices) {
  const amount =
    pr.unit_amount != null
      ? `$${(pr.unit_amount / 100).toFixed(2)}`
      : pr.custom_unit_amount
      ? "custom amount"
      : "?"
  console.log(
    `  price ${pr.id} — lookup "${pr.lookup_key ?? ""}" — ${amount} — product ${
      pr.product
    }`
  )
}

// --- provision ----------------------------------------------------------------
console.log(
  `\n=== Planned catalog (from ${rows.length} checked row${
    rows.length === 1 ? "" : "s"
  }) ===`
)
if (skipped.length) console.log(`Skipped (unchecked): ${skipped.join(", ")}\n`)

const priceMap = {}
let created = 0
let reused = 0

for (const [productId, priceRows] of byProduct) {
  const [first] = priceRows
  const existing = await getProduct(productId)
  let product = existing
  if (existing) {
    reused++
    console.log(`  [reused]  product ${productId} — "${existing.name}"`)
  } else if (APPLY) {
    product = await stripe.products.create({
      id: productId,
      name: first.name,
      metadata: first.metadata,
    })
    created++
    console.log(`  [created] product ${productId} — "${first.name}"`)
  } else {
    console.log(`  [create]  product ${productId} — "${first.name}"`)
  }

  for (const row of priceRows) {
    const existingPrice = product
      ? await getPriceByLookupKey(row.lookupKey)
      : null
    if (existingPrice) {
      reused++
      priceMap[productId] ??= {}
      priceMap[productId][row.lookupKey] = existingPrice.id
      console.log(
        `  [reused]  price ${row.lookupKey} — ${describeRow(row)} -> ${
          existingPrice.id
        }`
      )
    } else if (!product) {
      // dry-run with the product still to create — the price will be created with it
      console.log(
        `  [create]  price ${row.lookupKey} — ${describeRow(
          row
        )} on product ${productId}`
      )
    } else if (APPLY) {
      const price = await stripe.prices.create({
        product: product.id,
        currency: "usd",
        lookup_key: row.lookupKey,
        metadata: row.metadata,
        // A `custom_unit_amount` price carries no fixed `unit_amount`: the buyer
        // enters the amount in Checkout, bounded by these values.
        ...(row.customUnitAmount
          ? {
              custom_unit_amount: {
                enabled: true,
                preset: Math.round(row.customUnitAmount.preset * 100),
                minimum: Math.round(row.customUnitAmount.minimum * 100),
                maximum: Math.round(row.customUnitAmount.maximum * 100),
              },
            }
          : { unit_amount: Math.round(row.amountUsd * 100) }),
      })
      created++
      priceMap[productId] ??= {}
      priceMap[productId][row.lookupKey] = price.id
      console.log(
        `  [created] price ${row.lookupKey} — ${describeRow(row)} -> ${
          price.id
        }`
      )
    } else {
      console.log(
        `  [create]  price ${row.lookupKey} — ${describeRow(
          row
        )} on product ${productId}`
      )
    }
  }
}

// --- coupons + promotion codes ------------------------------------------------
if (coupons.length) {
  // `applies_to` is the checked tournament products, so the ladder follows the
  // division rows rather than repeating their ids here.
  const appliesTo = [...byProduct.keys()].filter(
    (productId) => byProduct.get(productId)[0].metadata.family === "tournament"
  )
  console.log(
    `\n=== Planned coupons (applies_to: ${
      appliesTo.join(", ") || "nothing checked"
    }) ===`
  )

  for (const coupon of coupons) {
    if (coupon.amountOffUsd == null) {
      console.warn(`  [skip]    coupon ${coupon.id} — no amount_off given`)
      continue
    }

    const existingCoupon = await getCoupon(coupon.id)
    if (existingCoupon) {
      reused++
      console.log(`  [reused]  coupon ${coupon.id} — "${existingCoupon.name}"`)
    } else if (APPLY) {
      await stripe.coupons.create({
        id: coupon.id,
        // Stripe caps a coupon's name at 40 characters.
        name: coupon.name.slice(0, 40),
        amount_off: Math.round(coupon.amountOffUsd * 100),
        currency: "usd",
        metadata: { kind: "sc7s-additional-side" },
        ...(appliesTo.length ? { applies_to: { products: appliesTo } } : {}),
      })
      created++
      console.log(`  [created] coupon ${coupon.id} — "${coupon.name}"`)
    } else {
      console.log(`  [create]  coupon ${coupon.id} — "${coupon.name}"`)
    }

    if (!coupon.promotionCode) continue

    const existingCode = await getPromotionCode(coupon.promotionCode)
    if (existingCode) {
      reused++
      console.log(
        `  [reused]  promotion code ${coupon.promotionCode} -> ${coupon.id}`
      )
    } else if (APPLY) {
      await stripe.promotionCodes.create({
        // The API nests the underlying coupon under `promotion`; the old flat
        // `coupon` param is gone and errors `parameter_unknown`.
        promotion: { type: "coupon", coupon: coupon.id },
        code: coupon.promotionCode,
      })
      created++
      console.log(
        `  [created] promotion code ${coupon.promotionCode} -> ${coupon.id}`
      )
    } else {
      console.log(
        `  [create]  promotion code ${coupon.promotionCode} -> ${coupon.id}`
      )
    }
  }
}

// --- output -------------------------------------------------------------------
if (!APPLY) {
  console.log(
    `\nDry-run complete — items marked [create] would be created; [reused] already exist.\nEdit docs/agents/stripe-catalog-approval.md as needed, then run with --apply.`
  )
} else {
  console.log(`\n=== Done — ${created} created, ${reused} reused ===`)
  console.log(
    "\nPrice map (sku -> lookup_key -> priceId) for src/lib/checkout/catalog.ts:"
  )
  console.log(JSON.stringify(priceMap, null, 2))
}
