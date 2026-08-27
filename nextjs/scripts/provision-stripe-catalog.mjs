#!/usr/bin/env node
/**
 * Provision the Stripe store catalog (products + prices) on the LIVE account
 * from the approval checklist in `docs/agents/stripe-catalog-approval.md`.
 *
 * Only rows checked `[x]` in the checklist are created. Rows sharing a Product
 * ID create one product (metadata from the first checked row) plus one price
 * each. Idempotent: existing products (by id) and prices (by lookup_key) are
 * reused, never duplicated.
 *
 * Usage (from pghrugby/nextjs):
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
  "../../docs/agents/stripe-catalog-approval.md"
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
  const skipped = []
  let current = null

  const flush = () => {
    if (!current) return
    if (current.checked) {
      for (const p of current.prices) {
        rows.push({
          productId: current.productId,
          name: current.name,
          amountUsd: p.amountUsd,
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
        productId: header[2],
        name: header[3].trim(),
        metadata: {},
        prices: [],
        checked: header[1].toLowerCase() === "x",
      }
      continue
    }
    if (!current) continue

    // "  - price: 200.00, lookup_key: `dues-fall-2026`"
    const price = line.match(
      /^\s*- price:\s*([0-9.]+)\s*,\s*lookup_key:\s*`([^`]+)`\s*$/
    )
    if (price) {
      current.prices.push({
        amountUsd: parseFloat(price[1]),
        lookupKey: price[2],
      })
      continue
    }

    // "  - metadata: family=dues, season=fall, kind=one-time"
    const meta = line.match(/^\s*- metadata:\s*(.+)$/)
    if (meta) current.metadata = parseMetadata(meta[1].trim())
  }
  flush()
  return { rows, skipped }
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

const { rows, skipped } = parseChecklist()
if (rows.length === 0) {
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
        `  [reused]  price ${row.lookupKey} — $${row.amountUsd.toFixed(2)} -> ${
          existingPrice.id
        }`
      )
    } else if (!product) {
      // dry-run with the product still to create — the price will be created with it
      console.log(
        `  [create]  price ${row.lookupKey} — $${row.amountUsd.toFixed(
          2
        )} on product ${productId}`
      )
    } else if (APPLY) {
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(row.amountUsd * 100),
        currency: "usd",
        lookup_key: row.lookupKey,
        metadata: row.metadata,
      })
      created++
      priceMap[productId] ??= {}
      priceMap[productId][row.lookupKey] = price.id
      console.log(
        `  [created] price ${row.lookupKey} — $${row.amountUsd.toFixed(2)} -> ${
          price.id
        }`
      )
    } else {
      console.log(
        `  [create]  price ${row.lookupKey} — $${row.amountUsd.toFixed(
          2
        )} on product ${productId}`
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
