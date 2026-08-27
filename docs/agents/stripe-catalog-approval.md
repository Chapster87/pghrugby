# Stripe Store Catalog — Approval Checklist

Approval gate for wayfinder ticket **Task: Provision the live Stripe store catalog**.
**Nothing is created until you approve.** Edit this file — uncheck items you don't
want, delete items entirely, or change amounts — then run:

```bash
cd pghrugby/nextjs
pnpm provision:stripe          # dry-run: what WOULD be created (no writes)
pnpm provision:stripe:apply    # create exactly the [x] items + print price map
```

The provisioning script reads **only the `- [x]` product blocks below**. One block
per product; multiple `- price:` lines add multiple prices. Metadata follows the
SKU scheme in `docs/agents/stripe-catalog-spec.md` §4.

## Live WooCommerce context (scanned 2026-08-26)

What the live site currently sells that's relevant, for cross-checking:

- **Team Dues** (bundle, /product/dues) — From $200, in stock
  - bundles **Dues - Spring $200**
- **Dues - Spring** — $200, in stock (current in-stock dues product)
- **Dues - Fall** — $300, **out of stock** ⚠ $300, not $200
- **Supporter Dues** (variable) — out of stock, legacy
- **Dues** (variable, slug team-dues) — out of stock, legacy
- **Steel City 7s** — divisions $400 / sides $375 = late-fee rate (2026 event was July 11); standard is $350/$325
- **Golf Outing** — Registration/Ticket $110 (in stock, Oct 2 2026 Blackhawk GC); Mulligan + All You Can Drink $30 (out of stock)
- **Forge Day at the Ballpark** — Adult $40 · 16 & Under $35 (out of stock) — added per club request
- **NFL Survivor Pool** — Ticket $20 · Insurance $10 (grouped "Pittsburgh Forge NFL Survivor Pool", out of stock) — added per club request
- **Steel City 7s Bar Crawl** — $5 (out of stock) — added per club request
- **Annual Forge Pig Roast Ticket** — $25 (in stock) — added per club request
- **Club Donation** — open pricing (customer enters amount)
- **"Pass the Hat" Fund** — $1, out of stock, optional per spec

There is **no "Dues - Summer" product** on the live site — included below,
unchecked, in case the club runs a summer cycle.

## Proposed catalog — edit, then run `--apply`

`- [x]` = create · `- [ ]` = skip

- [x] product `dues-fall` — Fall 2026 Season Dues
  - price: 250.00, lookup_key: `dues-fall-2026`
  - metadata: family=dues, season=fall, kind=one-time
  - note:

- [x] product `dues-spring` — Spring Season Dues
  - price: 200.00, lookup_key: `dues-spring-2026`
  - metadata: family=dues, season=spring, kind=one-time
  - note: current live in-stock dues product

- [x] product `dues-summer` — Summer Season Dues
  - price: 100.00, lookup_key: `dues-summer-2026`
  - metadata: family=dues, season=summer, kind=one-time
  - note: only if the club runs a summer cycle

- [x] product `golf-outing-registration` — Golf Outing Registration
  - price: 110.00, lookup_key: `golf-outing-registration-2026`
  - metadata: family=golf, kind=one-time, registration=true
  - note: live $110

- [x] product `golf-outing-mulligan` — Golf Outing — Mulligan (4 + contest entry)
  - price: 30.00, lookup_key: `golf-outing-mulligan-2026`
  - metadata: family=golf, kind=one-time
  - note: WP shows out of stock

- [x] product `golf-outing-drink-band` — Golf Outing — All You Can Drink
  - price: 30.00, lookup_key: `golf-outing-drink-band-2026`
  - metadata: family=golf, kind=one-time
  - note: WP shows out of stock

- [x] product `sc7s-mens-open` — SC7s Men's Open
  - price: 400.00, lookup_key: `sc7s-mens-open-2026`
  - metadata: family=tournament, division=mens-open, kind=one-time, registration=true
  - note:

- [x] product `sc7s-mens-social` — SC7s Men's Social
  - price: 400.00, lookup_key: `sc7s-mens-social-2026`
  - metadata: family=tournament, division=mens-social, kind=one-time, registration=true
  - note:

- [x] product `sc7s-mens-super-social` — SC7s Men's Super Social
  - price: 400.00, lookup_key: `sc7s-mens-super-social-2026`
  - metadata: family=tournament, division=mens-super-social, kind=one-time, registration=true
  - note:

- [x] product `sc7s-womens-open` — SC7s Women's Open
  - price: 400.00, lookup_key: `sc7s-womens-open-2026`
  - metadata: family=tournament, division=womens-open, kind=one-time, registration=true
  - note:

- [x] product `sc7s-womens-social` — SC7s Women's Social
  - price: 400.00, lookup_key: `sc7s-womens-social-2026`
  - metadata: family=tournament, division=womens-social, kind=one-time, registration=true
  - note: **missing from catalog.ts** — will be added

- [x] product `sc7s-mens-additional-side` — SC7s Men's Additional Side
  - price: 375.00, lookup_key: `sc7s-mens-additional-side-2026`
  - metadata: family=tournament, division=mens-additional-side, kind=one-time, registration=true
  - note:

- [x] product `sc7s-womens-additional-side` — SC7s Women's Additional Side
  - price: 375.00, lookup_key: `sc7s-womens-additional-side-2026`
  - metadata: family=tournament, division=womens-additional-side, kind=one-time, registration=true
  - note:

- [x] product `donation-club` — Club Donation
  - price: 10.00, lookup_key: `donation-club-preset-10`
  - price: 25.00, lookup_key: `donation-club-preset-25`
  - price: 50.00, lookup_key: `donation-club-preset-50`
  - metadata: family=donation, kind=donation
  - note: fixed presets, bundleable

- [x] product `donation-pass-the-hat` — "Pass the Hat" Fund
  - price: 1.00, lookup_key: `donation-pass-the-hat`
  - metadata: family=donation, kind=donation
  - note:

### Event tickets — added per club request (`family=events`)

> `family=events` extends the spec's family enum (membership|dues|golf|tournament|donation) to cover these one-off event tickets.

- [x] product `ballpark-day-adult` — Forge Day at the Ballpark — Adult
  - price: 40.00, lookup_key: `ballpark-day-adult-2026`
  - metadata: family=events, kind=one-time
  - note: WP "Ballpark Day Adult" $40

- [x] product `ballpark-ticket-16-under` — Forge Day at the Ballpark — 16 & Under
  - price: 35.00, lookup_key: `ballpark-ticket-16-under-2026`
  - metadata: family=events, kind=one-time
  - note: WP "16-or-Under Ballpark Ticket" $35

- [x] product `nfl-survivor-pool-ticket` — NFL Survivor Pool — Ticket
  - price: 20.00, lookup_key: `nfl-survivor-pool-ticket-2026`
  - metadata: family=events, kind=one-time
  - note: WP "NFL Survivor Pool Ticket" $20

- [x] product `nfl-survivor-pool-insurance` — NFL Survivor Pool — Insurance
  - price: 10.00, lookup_key: `nfl-survivor-pool-insurance-2026`
  - metadata: family=events, kind=one-time
  - note: WP "NFL Survivor Pool Insurance" $10

- [x] product `steel-city-7s-bar-crawl` — Steel City 7s Bar Crawl
  - price: 5.00, lookup_key: `steel-city-7s-bar-crawl-2026`
  - metadata: family=events, kind=one-time
  - note: WP $5

- [x] product `annual-forge-pig-roast` — Annual Forge Pig Roast Ticket
  - price: 25.00, lookup_key: `annual-forge-pig-roast-2026`
  - metadata: family=events, kind=one-time
  - note: WP $25

## Reuse — exists on the live account, do NOT create (verified by dry-run)

- **Club Membership** — {Diamond, Platinum, Gold, Silver, Bronze} × {Monthly, Yearly}
  - 10 prices, $15–$2,500 (the 10 Buy Buttons); product ids are auto-generated, not the `membership-*` scheme
- **Neal R. Brendel Scholarship Donation**
  - one product remains: `prod_V7ggaQ70PMEQyy` (price `price_1U7RIp…`), behind the /brendel-scholarship Buy Button — reuse for `donation-brendel` (duplicate deleted 2026-08-27)
- **Pay the Forge**
  - existing donation product with 2 custom-amount prices — decide: reuse for `donation-club` or keep separate

The PWYW (`custom_unit_amount`) price on `donation-club` is **not** in this
checklist — it belongs to the pay-what-you-want donation UX ticket.
