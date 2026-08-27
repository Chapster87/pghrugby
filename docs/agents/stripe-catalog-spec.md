# Stripe Catalog Spec — current state and target catalog

Research asset for wayfinder map issue **Wayfinder map: Single-repo Next.js site on Stripe + DatoCMS + ForgeCMS**, resolving **Research: Stripe catalog survey** (#2 on `Chapster87/pghrugby`). Supporting digest: `docs/agents/stripe-catalog-docs-research.md` (every Stripe API fact cited to docs.stripe.com). Companion capability checklist: `docs/agents/stripe-embedded-checkout-capabilities.md`.

This is the spec the cart catalog (`src/lib/prototype-stripe/catalog.ts` in the spike), the DatoCMS product model ticket, and Checkout Session creation key off. Amounts are the smallest currency unit (cents) where noted.

## 1. Current state of the Stripe account (verified 2026-08-24)

### The live account

- Per the club: the live Stripe account is **essentially brand new** — the only things in it are a **donation Payment Link** and the **membership subscriptions**.
- The live WordPress site embeds Stripe Buy Buttons (Payment Links) under live publishable key `pk_live_51RT7eA...`:
  - **Club Membership page**: 10 Buy Buttons — the 5 General Member tiers × (monthly / yearly). Each Buy Button wraps a Payment Link backed by a Price on a membership Product.
  - **Neal R. Brendel Scholarship Fund page**: 1 Buy Button (`buy_btn_1U7RIu...`) — a donation Payment Link.
- Every Payment Link opens a Checkout Session and emits the same `checkout.session.completed` events as an embedded session, so the membership Prices are reusable by the new store's embedded Checkout without recreating them. (Source: `stripe-catalog-docs-research.md` §3.)

### Current membership tiers (the live Buy Buttons)

General Club Memberships, annual basis (Jan–Dec), each with a monthly and a yearly price:

| Tier | Monthly | Yearly | Prominent benefits |
| --- | --- | --- | --- |
| Diamond | $250 | $2,500 | Spotlight feature, plaque at Ruggers, 4 gala seats, SC7s field naming rights |
| Platinum | $100 | $1,000 | Spotlight feature, golf-outing signage, plaque |
| Gold | $50 | $500 | Newsletter, 2 gala seats |
| Silver | $25 | $250 | Newsletter |
| Bronze | $15 | $150 | Newsletter |

The membership page still carries stale **Venmo** payment instructions; the map's standing preference is that these move to Stripe (the Buy Buttons already are Stripe).

### The legacy Medusa-era key is dead weight

`STRIPE_API_KEY` in `pghrugby-store/.env` is a **test-mode** key for account `acct_1RT7eIR1ZGc2p07H` ("Pittsburgh Forge Rugby Club sandbox"). Queried 2026-08-24: **zero** products, prices, payment links, customers, and subscriptions. It has nothing to reuse or migrate. Flag for the environment/secrets inventory ticket (decommission with Medusa).

### Everything else still sells through WordPress/WooCommerce

The club's non-membership revenue currently flows through WooCommerce checkout or PayPal/Venmo — not Stripe. Live-site prices (the basis for the target catalog):

| Family | Live product | Live price |
| --- | --- | --- |
| Season dues | Team Dues (competitive cycle Sep 1 – Aug 31) | From $200 |
| Season dues | Dues – Spring | $200 |
| Golf outing | Golf Outing Registration / Ticket (Oct, Blackhawk GC, Beaver Falls PA) | $110/person, includes food & drink |
| Golf outing | Mulligan (4 mulligans + 1 contest entry) | $30 |
| Golf outing | All You Can Drink | $30 |
| Golf outing | Sponsorship packages (variable, custom) | currently out of stock |
| Tournament | Steel City 7s — Men's/Women's Open, Social, Men's Super Social | entry $350/team, second side $325, +$50 after deadline ($400/$375 at checkout) |
| Donation | Club Donation | PayPal link (stale) |
| Donation | "Pass the Hat" Fund | $1 (out of stock) |

The map's real product line is exactly five families — registrations (golf outing, tournament), season dues, donations, memberships. The site's other WooCommerce items (gala, 5k, ballpark, pig roast, pools, raffle, merch) are one-off fundraisers outside the destination.

## 2. Target catalog

Stripe's catalog rule: *a separate product per distinct option a customer chooses between; prices are billing variants of one product.* (Source: `stripe-catalog-docs-research.md` §7.) Applied to the five families:

### 2.1 Memberships (recurring) — exists in Stripe; reuse

- **Products**: one per tier (`membership-diamond`, `-platinum`, `-gold`, `-silver`, `-bronze`) — the tiers are distinct options with distinct names/benefits, so separate products (matches the 10 live Buy Buttons = 5 products × 2 prices).
- **Prices**: `monthly` + `yearly` per tier (recurring `month`/`year`), reusing the existing live Price IDs where possible.
- **Not bundled**: a subscription's Checkout Session runs in `subscription` mode. Mixing one-time items in is allowed (they land on the initial invoice) but the first build should keep memberships on their own flow; the store can deep-link or embed as a separate session.
- **Decision (graduated ticket)**: whether memberships stay on their live Payment Links / Buy Buttons or are served from the new store's embedded Checkout. Either way the underlying Prices are the same; the orders table records `checkout.session.completed` from both.

### 2.2 Season dues (one-time) — to create

- **Products**: one per season type — `dues-fall`, `dues-spring` (and `dues-summer` if the club runs one). Recommended over a single shared "Season Dues" product because line-item descriptions on receipts/orders come from the product name — separate products keep "Fall Dues" vs "Spring Dues" distinguishable in the `orders` line items.
- **Prices**: one one-time price per season-year (`dues-fall-2026`, …) at **$200** (current rate; confirm before go-live). When the rate changes, create a new price and archive the old (prices are immutable; source: docs-research §7 lifecycle).
- **Flow**: season dues is the spike's "Case A" cart — one line item, quantity 1.

### 2.3 Golf outing registration (one-time) — to create

- **Products**:
  - `golf-outing-registration` — one-time price `$110` (per golfer; quantity = golfers, payload = captain + player names; spike "Case B").
  - `golf-outing-mulligan` — `$30`.
  - `golf-outing-drink-band` — `$30`.
  - (Sponsorship packages: variable/custom, currently out of stock — treat as out of the first build; sell via contact form until a custom flow is wanted.)
- **Flow**: registration is one line item × N with the per-golfer form payload beside the session (spike verdict), add-ons as additional fixed-price line items in the same session.

### 2.4 Tournament divisions (one-time) — to create

- **Products**: one per division — `sc7s-mens-open`, `sc7s-mens-social`, `sc7s-mens-super-social`, `sc7s-womens-open`, `sc7s-womens-social`, `sc7s-mens-additional-side`, `sc7s-womens-additional-side` (matches the live division set).
- **Prices**: one one-time price per division per event year. Live basis: `$350` entry / `$325` second side, `+$50` after the deadline (`$400`/`$375`). Which rate is live in Stripe at any time is an operational call (new price + archive old at the deadline).
- **Flow**: same registration pattern as golf — one line item, quantity 1 per team per division, team payload beside the session.

### 2.5 Donations (one-time) — exists (minimally); extend

- **Products**:
  - `donation-club` — the club donation (PayPal today). One product holds **both** price kinds:
    - Fixed presets (`donation-club-preset-10` / `-25` / `-50`; the spike's defaults) — bundleable with dues.
    - One `custom_unit_amount` price (`donation-club-any`) for pay-what-you-want — **sole line item only** (hard constraint, see §3).
  - `donation-brendel` — the Brendel Scholarship Fund (live Buy Button already exists; reuse its price).
  - `donation-pass-the-hat` — teammate hardship fund ($1 min), optional in first build.
- **Flow**: donations use `submit_type: 'donate'` and `customer_creation: 'always'`.

## 3. Grouping semantics (what can share a Checkout Session)

| Combo | Allowed? | Why |
| --- | --- | --- |
| Season dues + fixed-amount donation preset | ✅ | Both are fixed prices; two line items, one session (spike Case A). |
| Golf outing + add-ons (mulligan, drink band) | ✅ | All fixed prices, one session. |
| Registration + donation | ✅ in principle | Fixed prices mix freely; keep the payload beside the session, not in metadata. |
| **Any session with a pay-what-you-want donation** | ❌ | `custom_unit_amount` must be the **only** line item (qty 1), no promo codes/discounts/recurring. The PWYW donation UX is its own graduated ticket (Grilling: Pay-what-you-want donation UX). |
| Membership subscription + one-time items | ⚠️ | Allowed by Stripe (one-time items land on the initial invoice) but out of the first build; keep memberships in their own session. |

Source: `stripe-catalog-docs-research.md` §5 (PWYW constraints), §2 (mixing rules).

## 4. SKU / metadata scheme (what the cart, DatoCMS, and sessions key off)

Stripe has no "SKU" object anymore — the documented mechanism for tying Stripe to internal systems is the **Product `id`** (user-selectable at creation) plus **metadata**, and `lookup_key` for stable price references. (Source: docs-research §1, §7.)

- **Stable product keys** (the `sku`): the ids proposed in §2 (`membership-diamond`, `dues-fall`, `golf-outing-registration`, `sc7s-mens-open`, `donation-club`, …). These are the strings the cart catalog and DatoCMS records use; they never change once created.
- **Price references**: keep Price IDs (`price_...`) in the server catalog (`src/lib/.../catalog.ts` replacing the spike's hardcoded amounts) or in DatoCMS product records; set `lookup_key` per price for human-readable stable references (`dues-fall-2026`, `membership-diamond-yearly`).
- **Product metadata** (structured, human-auditable): `family` (`membership|dues|golf|tournament|donation`), `season` (dues), `division` (tournament), `kind` (`one-time|recurring|donation`), `registration` (`true` when a payload must ride beside the session). Metadata limits: 50 keys, key ≤ 40 chars, value ≤ 500 chars, no `[`/`]` in keys.
- **DatoCMS product record** (for ticket DatoCMS product and taxonomy models): editorial content keyed to a **Stripe Price ID** (the ticket's stated seam) with the product `sku`/family as the taxonomy anchor; price stays authoritative in Stripe, never overridden in DatoCMS.
- **Orders table**: line items are recorded from the session (`description`, `quantity`, `amount_total`); the `sku`/`lookup_key` can ride in line-item metadata or be derived from the price → product mapping at record time.
- **`client_reference_id`** = cartRef stays the reconciliation key (≤ 200 chars); registration payloads never go in Stripe metadata (spike verdict, capabilities research §5/§6).

## 5. Tax considerations

Grounded in docs-research §4; the exact classifications below are **provisional and must be confirmed with a tax advisor** (Stripe's docs explicitly defer legal classification).

- **Stripe Tax only calculates where an active registration exists** — register for PA (and any nexus states) or tax stays zero. Verify enablement + registration status in the Dashboard.
- **`tax_behavior`**: automatic default is *exclusive* for USD (tax added on top of price); once set inclusive/exclusive it can't be changed.
- **Provisional product tax codes** (per family):

| Family | PTC | Notes |
| --- | --- | --- |
| Donations | `txcd_90000001` (Cash Donation) | Brendel, club donation |
| Memberships | `txcd_50021001` (Fitness/Club dues) | Non-profit nuance: the site treats the incremental membership fee as a donation and issues a donation receipt — the split's tax treatment is a legal determination |
| Tournament divisions | `txcd_50012003` (Participant competition fee) | SC7s |
| Golf outing | `txcd_50010002` (Sporting facility participant) | Golf |
| Fallback | `txcd_00000000` (Nontaxable) | only if advised |

- **Webhook/tax**: with `automatic_tax` enabled, `total_details.amount_tax` arrives on the `checkout.session.completed` object; Stripe Tax charges a per-transaction calculation fee when a registration covers the jurisdiction.
- **Donation support requirements**: the pay-what-you-want guide defers to Stripe Support for requirements around accepting donations/tips on the account — check before going live with the donation flow.
- **Dashboard verification list** (unresolvable from docs): tax registrations, dynamic vs async payment methods, `custom_unit_amount.minimum` (current USD minimum charge), the exact Price IDs behind the live membership/donation Payment Links, and whether live products should be re-created vs reused.

## 6. Decisions deferred to other tickets (not resolved here)

- **Membership migration** (Payment Links vs embedded Checkout, subscriber continuity) — graduated as a new grilling ticket from this survey.
- **Pay-what-you-want donation UX** — already a live grilling ticket on the map.
- **Storefront surfaces / collections vs Stripe products** — already a live grilling ticket (Catalog UI scope).
- **DatoCMS product + taxonomy model** — already a live prototype ticket, blocked by this survey; the §4 scheme is its input.
- **Go-live amounts** (dues, golf, SC7s rates) — club operational call; this spec defaults to today's live-site prices.
