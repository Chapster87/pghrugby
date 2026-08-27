# Stripe Catalog Spec — Primary-Source Research Digest

Research asset for the wayfinder map issue **Wayfinder map: Single-repo Next.js site on Stripe + DatoCMS + ForgeCMS**, subtask **What a "catalog spec" needs to look like for a Stripe-backed store**. Scope: Stripe Product/Price semantics, one-time vs recurring in Checkout, Payment Links migration, US tax handling for a club, pay-what-you-want donations, and catalog organization for ~5 product families / ~10–15 prices.

All facts verified against docs.stripe.com primary sources (API reference + official guides) on 2026-08-24. Every claim cites the exact source URL. Nothing here is legal/tax advice.

## Executive summary

- Stripe's catalog is **Products** (what you sell, name + description + tax code + optional per-product `id` you choose yourself) and **Prices** (how much/how often; `one_time` or `recurring`). A single Product can carry many Prices, including a mix of one-time and recurring. There is no SKU resource; the documented pattern is to use **your own product IDs** (Stripe lets you set them) or metadata for internal ids.
- Checkout Sessions can **mix one-time and recurring line items in `subscription` mode** (one-time items land on the initial invoice). `mode: 'subscription'` is required as soon as any line item is recurring.
- Payment Links are thin wrappers: every Payment Link opens a **Checkout Session** and emits the same `checkout.session.completed` events. Membership Payment Links therefore migrate to embedded Checkout Sessions by reusing the same Price IDs with `ui_mode: 'embedded_page'`.
- A pay-what-you-want Price (`custom_unit_amount`) **must be the only line item** (quantity 1), supports no discounts, no optional items, no recurring. Use `submit_type: 'donate'` for donations.
- Tax: Stripe Tax only calculates in jurisdictions where you have an **active registration**; without one it returns zero tax. Product tax codes (PTCs) exist for exactly this club's items (`txcd_90000001` Cash Donation, `txcd_50021001` membership dues, `txcd_50012003` participant competition fee, `txcd_00000000` Nontaxable). US tax is exclusive; set default tax behavior + preset PTC in the Dashboard.

---

## 1. Product & Price object semantics; SKU-like needs; metadata limits

### Product object fields
`id` (unique), `name` (required, displayable), `description` (nullable, displayable), `metadata` (map), `default_price` (expandable Price id), `tax_code` (nullable), `active`, `images`, `statement_descriptor`, `unit_label`, `url`, `package_dimensions`, `shippable`. On create, `name` is the only required field; `tax_code` is **"Recommended if calculating taxes."**

Source: https://docs.stripe.com/api/products

### Price object fields
`id`, `active`, `currency`, `metadata`, `nickname` ("A brief description of the price, hidden from customers"), `product` (expandable), `recurring` (nullable; only on recurring prices), `tax_behavior` (`inclusive` / `exclusive` / `unspecified` — "Once specified as either `inclusive` or `exclusive`, it cannot be changed"), `type` (`one_time` or `recurring`), `unit_amount` (smallest currency unit), `unit_amount_decimal`, `billing_scheme` (`per_unit`/`tiered`), `custom_unit_amount` (see §5), `lookup_key` (nullable, up to 200 characters), `tiers`, `tiers_mode`, `transform_quantity`, `currency_options`.

Sources: https://docs.stripe.com/api/prices ; https://docs.stripe.com/api/prices/object

### There is no "SKU" anymore — how to carry an internal id
- The SKU resource no longer appears in the API reference's Products section (Products / Prices / Coupons / Promotion Codes / Discounts / Tax Codes / Tax Rates / Shipping Rates only), and the Plans page states the Prices API "replaces the Plans API." Source: https://docs.stripe.com/api/products ; https://docs.stripe.com/api/plans
- **Recommended pattern for an internal SKU/id: choose your own Product `id`.** "Each product has a unique ID. Unlike most Stripe resources, you can choose the ID of the product yourself. We recommend choosing an ID that makes it easy to integrate Stripe with other systems you use. For example, if you're selling physical goods, you can use the internal ID from your own systems." Source: https://docs.stripe.com/products-prices/how-products-and-prices-work
- The catalog-import guide repeats this for sync: "To map products in your system to products in Stripe, assign each product that you import a unique id." Source: https://docs.stripe.com/products-prices/manage-prices
- `metadata` is the general structured key-value mechanism on Products and Prices (and Customers, Sessions, etc.) for "storing additional information about the object in a structured format"; it's invisible to customers and doesn't affect authorization. Source: https://docs.stripe.com/api/products ; https://docs.stripe.com/metadata
- Price `lookup_key` exists specifically so frontends can fetch a price by a stable string instead of hard-coding IDs (retrieve via `lookup_keys[]=`). Source: https://docs.stripe.com/products-prices/manage-prices

### Metadata limits
- **50 key-value pairs** per object; **key ≤ 40 characters** and square brackets `[` `]` are **forbidden in keys**; **value ≤ 500 characters**.
- If more space is needed: "store your data in your external database and use a key-value pair to store the external object's ID in metadata." Never store sensitive data in metadata. Metadata is redacted from objects returned to publishable-key (client-side) requests.

Source: https://docs.stripe.com/metadata

---

## 2. One-time vs recurring; mixing in one Checkout Session

### Exact Price shapes
- **One-time:** `type: 'one_time'`, `recurring: null`. Created by omitting `recurring` entirely (e.g. a setup fee: `unit_amount=2000`, `currency=usd`, no `interval`). Source: https://docs.stripe.com/products-prices/manage-prices ; https://docs.stripe.com/api/prices
- **Recurring:** `type: 'recurring'` with `recurring: { interval, interval_count, usage_type }`. `interval` is one of `day`, `week`, `month`, `year`; `interval_count` is the number of intervals between billings; `usage_type` is `metered` or `licensed` (default `licensed`). Source: https://docs.stripe.com/api/prices/object ; https://docs.stripe.com/api/plans

### One Product, many Prices (including mixed one-time + recurring)
- "Different physical goods or levels of service should be represented by products, and pricing options should be represented by prices… you might have a single 'gold' product that has prices for $10/month, $100/year, and €9 once." Source: https://docs.stripe.com/api/prices
- "Products can use multiple prices to define different pricing options. The prices share the product description… only the pricing differs." Source: https://docs.stripe.com/products-prices/how-products-and-prices-work

### Checkout Sessions and subscription_mode
- `mode` enum: `payment` (one-time), `subscription` (fixed-price subscriptions), `setup`. **"Pass `subscription` if the Checkout Session includes at least one recurring item."** Source: https://docs.stripe.com/api/checkout/sessions/create
- A recurring price is passed as `line_items[].price`; the session creates a Subscription in `subscription` mode and a PaymentIntent in `payment` mode ("Once payment is successful, the Checkout Session will contain a reference to the Customer, and either the successful PaymentIntent or an active Subscription"). Source: https://docs.stripe.com/api/checkout/sessions

### Mixing one-time + recurring line items — allowed in `subscription` mode
- "For `payment` mode, there is a maximum of 100 line items… For `subscription` mode, there is a maximum of 20 line items with recurring Prices and 20 line items with one-time Prices. **Line items with one-time Prices will be on the initial invoice only.**" Source: https://docs.stripe.com/api/checkout/sessions/create
- The subscriptions integration guide shows the same pattern (a one-time setup-fee product+price passed alongside the recurring price): "If you created a one-time price in step 2, pass that price ID as well." Source: https://docs.stripe.com/billing/subscriptions/build-an-integration
- `subscription_data` is "a subset of parameters to be passed to subscription creation for Checkout Sessions in `subscription` mode" (e.g. `subscription_data.metadata`, see §6). Source: https://docs.stripe.com/api/checkout/sessions/create

---

## 3. Payment Links vs Checkout Sessions

### What a Payment Link is
- "A payment link is a shareable URL that will take your customers to a hosted payment page. A payment link can be shared and used multiple times. **When a customer opens a payment link it will open a new checkout session to render the payment page.** You can use checkout session events to track payments through payment links." Source: https://docs.stripe.com/api/payment-link
- Payment Links are created **based on a price**: "Use the Dashboard to create a Payment Link based on a price. The Payment Link uses the price to compute the order total. It also retrieves the product associated with the price. The product's name and image are used to render the payment page." Source: https://docs.stripe.com/products-prices/how-products-and-prices-work
- Payment Links can sell "a product, a subscription, or accept a donation" (subscriptions supported without code). Sources: https://docs.stripe.com/payment-links ; https://docs.stripe.com/products-prices/pricing-models
- Metadata caveat on migration: Payment Link metadata is copied to the Checkout Session it creates "in a one-time snapshot"; later link updates don't propagate to existing sessions. Source: https://docs.stripe.com/metadata

### Migration to embedded Checkout Sessions
- Both render paths are the same API: hosted `ui_mode: 'hosted_page'` vs embedded `ui_mode: 'embedded_page'` are UI-mode options of Checkout Sessions, and Payment Links already create Checkout Sessions under the hood. A membership Payment Link therefore migrates to a server-built embedded Checkout Session by reusing the same Product/Price IDs and setting `ui_mode: 'embedded_page'` (plus `return_url`, no `success_url`). The compatibility table shows recurring prices are supported by Checkout. Sources: https://docs.stripe.com/api/checkout/sessions/create ; https://docs.stripe.com/products-prices/how-products-and-prices-work ; https://docs.stripe.com/api/payment-link
- Payment Links automatically localize currency from the customer's IP via multi-currency prices; all prices in a link must share one default currency (same rule as Checkout Sessions). Source: https://docs.stripe.com/products-prices/manage-prices

---

## 4. Tax considerations (club/dues/donation sales in the US)

### Stripe Tax basics
- "In the US, businesses deal with sales tax." The compliance cycle is: (1) understand which locations require collection, (2) **register** in those locations, (3) calculate and collect, (4) file and remit. "You must register with the tax authority in a location to collect taxes there"; some states have registration thresholds. Source: https://docs.stripe.com/tax/how-tax-works
- **"Stripe only calculates tax in jurisdictions where you have an active tax registration. Without a registration in the customer's location, the calculation returns zero tax."** Source: https://docs.stripe.com/tax/tax-codes
- Stripe Tax determines rates from your business address, tax registrations, product tax codes, customers' locations, and customer status. "Taxability and tax rates vary by location and category of products you're selling." Source: https://docs.stripe.com/tax/how-tax-works

### tax_behavior (inclusive/exclusive)
- Set per-Price, or set a default in Tax settings. Recommended default is **Automatic** = exclusive for USD and CAD, inclusive elsewhere. "Exclusive: tax is added on top of the price… An example of exclusive tax is US sales tax." Once set to `inclusive`/`exclusive` it cannot be changed. Source: https://docs.stripe.com/tax/products-prices-tax-codes-tax-behavior ; https://docs.stripe.com/api/prices/object

### tax_code on products
- Set a PTC per product, or rely on a **preset product tax code** in Tax settings for products that don't specify one. Sources: https://docs.stripe.com/tax/tax-codes ; https://docs.stripe.com/tax/products-prices-tax-codes-tax-behavior

### How taxes appear in Checkout and in the webhook payload
- Enable per-session with `automatic_tax[enabled]=true`; Checkout then uses the collected shipping or billing address to determine the customer's location for tax calculation ("If you don't collect shipping information, Checkout uses the billing address"). Source: https://docs.stripe.com/payments/checkout/taxes
- The `checkout.session.completed` payload is the Checkout Session object, which carries `total_details` → `amount_tax` (plus `amount_discount`, `amount_shipping`) and `amount_total`. Source: https://docs.stripe.com/api/checkout/sessions/object
- Stripe Tax charges a per-transaction calculation fee when `automatic_tax` is enabled and an active registration covers the customer's jurisdiction (fees apply even when tax calculated is zero; no fee for zero-amount transactions). Source: https://docs.stripe.com/tax/how-tax-works

### Tax codes relevant to this club (exact `txcd_` strings; never guess others)
| PTC | Category | Use for |
| --- | --- | --- |
| `txcd_90000001` | Cash Donation | "A monetary donation for a cause, in which the donee receives nothing in return." |
| `txcd_90020001` | Optional Gratuity | Tips |
| `txcd_50021001` | Fitness Centers – Dues and Membership Fees | "Charges associated with recurring membership dues allowing access or use of health clubs and fitness clubs." (Note: "Outside of the United States, these charges are not applicable for services provided by non-profit sports organizations.") |
| `txcd_50012003` | Admission to Sporting Events – Participant Competition Fee | Tournament division registration |
| `txcd_50010002` | Admission to Sporting Facilities – Participant | Golf outing registration |
| `txcd_50010001` | Admission to Amusement/Recreation Venues – Participant | General event registration (Events codes are public preview) |
| `txcd_20030000` | General – Services | Fallback service category |
| `txcd_00000000` | Nontaxable | "Any nontaxable good or service… used to ensure no tax is applied" |

Source: https://docs.stripe.com/tax/tax-codes

### Are donations/dues/memberships taxable in the US? (NOT legal advice)
- Stripe's docs do **not** make the legal classification for you; the tax-codes page states the PTCs exist because taxability varies by jurisdiction and product category, and the tax-codes guide tells agents explicitly: "Don't make the legal tax classification for the user." Verify classification with a tax advisor and the relevant state tax authority. Sources: https://docs.stripe.com/tax/tax-codes ; https://docs.stripe.com/tax/how-tax-works
- Special support requirements for donations/tips: the pay-what-you-want guide says you can use the feature "to collect a tip for a service provided, accept donations for a cause… **Go to Stripe Support to learn more about Stripe's requirements for accepting tips or donations.**" Source: https://docs.stripe.com/payments/checkout/pay-what-you-want

---

## 5. Pay-what-you-want donation prices

### custom_unit_amount fields
`custom_unit_amount` is nullable on the Price object; when set it "provides configuration for the amount to be adjusted by the customer during Checkout Sessions and Payment Links":
- `custom_unit_amount.maximum` — max unit amount the customer can specify
- `custom_unit_amount.minimum` — "Must be at least the minimum charge amount"
- `custom_unit_amount.preset` — starting amount, editable by the customer

Source: https://docs.stripe.com/api/prices/object

### Hard constraints (confirmed from docs)
- "Pay-what-you-want payments have the following limitations: **You can't add any other line items and the quantity can only be 1.** You can't use promotion codes or discounts with them. **They don't support recurring payments or optional items.**"
- And: "If you select **Customer chooses price** as your pricing model, you can't add any other line items and the quantity can only be 1."

Source: https://docs.stripe.com/payments/checkout/pay-what-you-want

### Compatibility
- **"Customer chooses price" is only compatible with Checkout and Payment Links** (disallowed for Subscriptions, Quotes, Invoices). Source: https://docs.stripe.com/products-prices/how-products-and-prices-work (compatibility table)
- Fixed-amount donations are a separate, normal price: inline pricing (`price_data` with a server-set `unit_amount`) is API-only and "you can't reuse or update inline prices." Source: https://docs.stripe.com/payments/checkout/pay-what-you-want

### submit_type: 'donate'
- `submit_type` enum on Checkout Session create: `auto`, `book`, `donate`, `pay`, `subscribe`. `donate` = "Recommended when accepting donations. Submit button includes a 'Donate' label." Source: https://docs.stripe.com/api/checkout/sessions/create

---

## 6. Recurring interval constraints; metadata / client_reference_id on subscriptions vs one-time

### Intervals
- `recurring.interval`: "One of `day`, `week`, `month` or `year`"; `interval_count` = intervals between billings. The Price example shows `recurring: { interval: 'month', interval_count: 1, usage_type: 'licensed' }`. Sources: https://docs.stripe.com/api/prices/object ; https://docs.stripe.com/api/plans
- "The maximum interval time period of a price is 3 years." Without flexible billing mode, all prices on a Subscription "must have the same `recurring.interval` and `recurring.interval_count`" (mixed intervals need flexible billing mode). Source: https://docs.stripe.com/products-prices/how-products-and-prices-work

### Checkout mode requirements
- `mode` is required; pass `subscription` if the session includes at least one recurring line item (§2). Sources: https://docs.stripe.com/api/checkout/sessions/create ; https://docs.stripe.com/payments/subscriptions

### client_reference_id and metadata
- `client_reference_id`: "A unique string to reference the Checkout Session. This can be a customer ID, a cart ID, or similar, and can be used to reconcile the session with your internal systems. The maximum length is 200 characters." It is a session-level field present in both `payment` and `subscription` modes and on the object in the webhook payload. Sources: https://docs.stripe.com/api/checkout/sessions/create ; https://docs.stripe.com/api/checkout/sessions/object
- Metadata flow (from the metadata guide's mapping table):
  - Session `metadata` → lives on the Checkout Session object → included in `checkout.session.completed`.
  - One-time: `payment_intent_data.metadata` → copied onto the underlying PaymentIntent.
  - Recurring: `subscription_data.metadata` → copied onto the underlying Subscription.
  - Subscription → Invoice: subscription metadata is copied to the Invoice's `parent.subscription_details.metadata` when the subscription creates an invoice.

Source: https://docs.stripe.com/metadata

---

## 7. Products/prices best practices for ~5 product families / ~10–15 prices

### The core rule
- "Create a separate product for each distinct option a customer chooses between. Use prices for billing variants (interval, currency) of the same product."
- "If two options appear as different rows on your pricing page, they must be different products. If they're the same row billed at a different interval (monthly versus annual), they're different prices on one product."
- "Don't attach prices for different tiers to a single product. Line items that share a product share its name and description on receipts and invoices. This means only the amount differs."

Source: https://docs.stripe.com/products-prices/how-products-and-prices-work

### When to create a new product vs. add a price
- **New product:** distinct name on your pricing page; different features/entitlements; different tax code; needs to appear as a separate line item.
- **Add a price to an existing product:** same plan, different billing interval; same plan, different currency; price change (create a new price and archive the old one).

Source: https://docs.stripe.com/products-prices/how-products-and-prices-work

### Lifecycle rules that constrain a catalog spec
- Prices are effectively immutable after creation: "After you create a price, you can only update its `metadata`, `nickname`, and `active` fields" and "you can't change a price's amount in the API. Instead… create a new price for the new amount, switch to the new price's ID, then update the old price to be inactive." You archive (never delete) used prices/products; only never-used prices are deletable, and only via the Dashboard. Source: https://docs.stripe.com/products-prices/manage-prices
- `default_price` on a product is "the most common price you want to present to customers" and must be an active price. Source: https://docs.stripe.com/products-prices/manage-prices
- For programmatic catalogs: import with unique product IDs, make scripts idempotent (create, then update if exists), keep sync with webhooks, and use `lookup_key` for stable price references. Source: https://docs.stripe.com/products-prices/manage-prices

### Direct application to this store (product-family mapping, guidance only)
Applying §7's rules to the 5 product families (final naming is a catalog-spec decision, not a doc fact):
- **Membership** — 1 product; recurring price(s). Monthly + annual = 2 recurring prices on one product (same row, different interval); a 3-year max interval applies to any single price.
- **Season dues (fall/summer/spring)** — each season is a distinct row/name and a separate line item → per the "distinct name on pricing page" and "separate line item" rules, model as 3 products (one per season) or 1 product with 3 one-time prices if a shared name is acceptable. Stripe's rules permit either; the choice is about how they must render on receipts/checkout.
- **Golf outing registration** — 1 product, one-time price.
- **Tournament division registration** — 1 product per distinct division (separate line items/names) or one product with multiple one-time prices; each needs its own tax code path (participant competition fee).
- **Donations** — 1 product; fixed-amount one-time prices (can ride in a session with other items) plus a single `custom_unit_amount` price for pay-what-you-want (which cannot share a session — §5). One product may hold both price types.
- At ~5 products and 10–15 prices, the catalog fits comfortably within Stripe's limits ("We don't limit the number of customers, coupons, products, prices, or most other objects"). Sources: https://docs.stripe.com/products-prices/how-products-and-prices-work ; https://docs.stripe.com/products-prices/manage-prices

---

## Unresolved / verify in the Stripe Dashboard

Account-level facts that cannot be resolved from docs and must be checked in the actual Stripe account:

- **Stripe Tax enablement & registrations:** Is Stripe Tax enabled? Which US state registrations are active (or registered via Stripe)? The preset product tax code and default tax behavior (Automatic/exclusive vs inclusive) under Dashboard → Settings → Tax. Zero tax is calculated for unregistered jurisdictions.
- **Payment methods:** dynamic payment methods on/off, and whether async methods (ACH/bank transfer) are enabled — if so, `checkout.session.async_payment_succeeded/failed` handling is required.
- **Existing Payment Links & their price IDs:** which prices the live membership/donation Payment Links reference (to reuse in embedded sessions), whether product IDs are already custom-set, and whether live products were "copied to live mode" from test mode (each copy is a separate live product).
- **Donation/tip requirements:** Stripe's support requirements for accepting tips/donations on this account (contact Stripe Support; flagged in §4).
- **Minimum charge amount:** the current USD minimum charge to set `custom_unit_amount.minimum`.
- **Nonprofit/tax status:** the club's entity/tax-exempt status and which PTCs are defensible — Stripe docs explicitly defer legal tax classification to the user and a tax advisor.
- **Existing subscriber migration:** current members paying through membership Payment Links — keep them on their live subscriptions while new signups go through embedded Checkout, or migrate them; the subscriptions and their billing remain on Stripe either way.
