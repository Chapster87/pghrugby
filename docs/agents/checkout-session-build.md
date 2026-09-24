# Checkout session build: snapshot timing, refusals, price resolution, metadata

Status: **decided 2026-09-23** for
[Checkout and order records for a simple cart](https://github.com/Chapster87/pghrugby/issues/82)
on
[Wayfinder map: Multi-product PDP to minicart to checkout](https://github.com/Chapster87/pghrugby/issues/54).

Companion to `docs/pdp-to-minicart-to-checkout-spec.md` § 8, and to
`docs/agents/pdp-pricing-and-sale-windows.md`, `docs/agents/pdp-product-model.md`,
`docs/agents/order-records-and-reporting.md` and
`docs/agents/stripe-checkout-registration-metadata.md`, whose decisions this
implements. It records what § 8 left to the build ticket, and one amendment.

## 1. The `carts` snapshot is written at session build

`POST /api/checkout/sessions` writes it, not the add-time validate call. The
snapshot is therefore the **checkout-time** cart: the entries the buyer was
looking at when they started paying, not the cart as it stood when they last
edited it.

- **Rejected: writing it at the flyout's Checkout click.** That is what #81
  landed (the route upserted on the way to Stripe), and it is one round trip
  fewer. It was rejected because it puts a durable write on a path whose job is
  to _answer a question_ — § 8.1 splits resolve/validate from build for exactly
  this reason — and because a validate call that also persists cannot be reused
  as a read-only check (the PDP-add path wants one).
- The cost is that the session build now needs the entries, so the **checkout
  page posts them** with the `cartRef` instead of the server reading a
  pre-written row. The browser cart is the source of truth for entries
  throughout; this just makes the last hop explicit.
- `recordOrder` is unchanged: it still re-joins the snapshot by
  `client_reference_id`, which the session carries.

**Left open, unchanged from § 8:** a re-checkout on the same `cartRef` rewrites
that row, so a stale embedded-checkout tab's order can be recorded against newer
entries. The snapshot is closer to checkout now, but a per-session cart ref —
a new `cartRef` minted per session build — is what would actually close it. Not
done here; it changes the cart's identity, not the snapshot's timing.

## 2. `POST /api/checkout/cart` is a read-only resolve/validate

It parses the entries, resolves every sku against DatoCMS, and answers with the
quoted lines — or with per-line errors. It **never persists**, so it can be
called at add time, on flyout checkout, and on page load without side effects.

A structurally unusable request (no `cartRef`, no priced line, an unreadable
body) is a `400`. A line that cannot be checked out is a `409` carrying
`errors`.

## 3. A refusal is per line, never a dropped line

The server refuses the **session**, never the line:

| Code              | Raised when                                  |
| ----------------- | -------------------------------------------- |
| `unknown-sku`     | the sku is not in `catalog.ts`               |
| `unknown-product` | the sku has no DatoCMS `product` record      |
| `sold-out`        | the record's `in_stock` is false             |
| `unpriced`        | live mode and no effective Price id resolves |

Each error carries the cart entry's `entryId`, which is its removal target.
`quoteCart` (`src/lib/checkout/cart-pricing.ts`) emits a line for every sku that
resolves at all, so the buyer's cart can never silently shrink: a mixed cart
with one sold-out division quotes its valid lines and names the bad one.

Both surfaces that can be refused render `RefusedLines`
(`src/components/cart/_components/refused-lines/`): the flyout (after the
validate call) and the checkout page (after the session build). Removing a line
there cascades to its add-ons and its collector entry, exactly as in the cart
list.

- **Consequence for the checkout page:** it fetches the client secret itself and
  passes `options={{ clientSecret }}`, rather than letting the provider call
  `options.fetchClientSecret`. `EmbeddedCheckoutProvider` has no `onError`, so a
  callback that throws has nowhere to surface a refusal; the page needs the
  response in hand.
- A rebuild is a fresh build: removing the refused line re-posts and re-resolves,
  so nothing is cached across the buyer's edit.

## 4. DatoCMS is the price authority; `catalog.ts` keeps the amount

`effectivePriceId = now ∈ [sale_starts_at, sale_ends_at] && sale_price_id ?
sale_price_id : price_id`, resolved by `effectivePriceId()`
(`src/lib/checkout/cart-pricing.ts`) on the record `resolveProductRecords()`
(`src/lib/checkout/product-records.ts`) reads in one cache-tagged CDA query.

- Resolved **twice**: at validate, and again fresh at session build, so a window
  that closes while the cart sits open re-prices rather than charging the
  early-bird rate.
- The window must be **fully authored** — both bounds present and parsable —
  before it can discount anything. A half-filled window reads as "not in range",
  the literal reading of § 8.2's formula, so a mis-authored sale can only fail to
  discount, never discount by accident.
- Live mode requires the effective Price id and fails loudly without one. Test
  mode bills inline `price_data` from `catalog.ts`'s `unitAmount`, because a test
  key cannot reference live Prices. Amounts stay server-side in both.
- **Rollout precondition: the CMS must carry the `price_id`s before the live flow
  ships.** As of 2026-09-23 every `product` record's `price_id` — and both sale
  fields — is empty: a read of all 21 records found nothing set. In live mode
  `requirePriceId` therefore refuses **every** line as `unpriced`, so deploying as
  it stands would block all checkout. Populate `product.price_id` from the
  approval checklist's provisioned Prices (the values `catalog.ts` already holds)
  before the cutover. **Test mode hides this entirely** — it bills `catalog.ts`'s
  `unitAmount` and never needs a Price id, which is why a local run passes.
- Line items are the priced lines **in cart order**; collector entries never
  become line items.

## 5. `families` comes from the catalog — and `events` is a real family

`metadata.families` and `payment_intent_data.metadata.families` are the distinct
`family` values across the cart's priced lines, joined, read from
`CatalogItem.family`.

- **Why not Stripe**, whose product metadata is the source `order_lines.family`
  and `deriveFamilies(session)` already read: in test mode the live Price ids do
  not exist to expand into a Product, so a Stripe read leaves the local checkout
  with no `families` at all — and criteria 1 and 2 are verified locally. The
  catalog is the same code-owned map the labels and amounts come from, and
  `docs/agents/stripe-catalog-approval.md` is the source for both. **Keep the
  two in step**: a `family` changed in Stripe and not here makes the session
  metadata disagree with the order row.
- **Amendment to the spec.** § 9.5 says the four one-off fundraisers "keep
  `family = null`". The approval checklist provisions `family=events` on all six
  event tickets and states the extension explicitly, so `deriveFamilies(session)`
  reads `events` for a pig-roast order. The catalog mirrors `events`, and a
  pig-roast order therefore reports `families = "events"` in Stripe and
  `{"events"}` in `orders`. The five canonical families are unchanged; `events`
  extends rather than replaces them.
- Written **unconditionally**, joining to an empty value when no line carries a
  family — § 8.5's table lists the key without a condition, and `reg_count` /
  `reg_ref` are written the same way.

**Where the two sides could drift.** `order_lines.family` and `orders.families`
are read back off the session's Stripe products, while this metadata is read off
the catalog. In live mode the two necessarily agree — the same provisioned
metadata is the source. Test mode is the case that needed handling: Stripe
**mints a Product** for the inline `price_data` (checked 2026-09-23 — a generated
`prod_…` carrying our name and an otherwise empty `metadata`), so the session
build now **writes the catalog's family onto that generated Product**. A local
order therefore records the same `family` and `families` production will. Its
`id` is still Stripe's rather than our sku, so `order_lines.sku` in a local run
names a generated product — which is why criterion 2's `sku` half is a live-mode
check and its family half is not.

**Confirmed against the live account** (2026-09-23, read-only): all 23 catalog
items carry in Stripe exactly the `family` this catalog claims, `events` included
— 0 mismatches, 0 prices missing. So a session's `metadata.families` and the
order rows derived from it agree in production. If a product's family is ever
changed in Stripe, change it here in the same breath.

## 6. `reg_N` / `reg_count` / `reg_ref`

Built by `buildOrderMetadata()` (`src/lib/checkout/order-metadata.ts`):

- `reg_N` — one per registration-bearing priced line, at its 0-based
  **`line_index`** (the join key shared with `order_lines`). The value is
  `` `${catalog label} x${quantity}: ${names}, …` ``, e.g. `"Golf Outing
Registration x4: Jane Smith, John Doe"`. Names are every answered field of the
  entry's **snapshotted** `fields`, in field order, repeatables flattened — so
  the summary describes the form the buyer actually filled
  (`docs/agents/registration-editing.md` § 7). An unanswered registration is just
  the header, `"… x2"`.
- An **add-on** line inherits its primary's registrants and renders them under
  its **own** label and quantity; a line with no primary (dues, a donation) gets
  no key.
- `reg_count` — the number of **registrations**, not lines: one per collector
  entry whose primary is in the session. An add-on inheriting a roster does not
  inflate it. Written even when `0`.
- `reg_ref` — always the `client_reference_id` (the `cartRef`).
- **Caps.** Values are capped at 500 characters, keeping the header and as many
  names as fit, ending `… +N more` — the untruncated payload is in
  `order_registrations.answers`, reached through `reg_ref`. Keys are capped at
  50 per object: the `reg_N` that no longer fit ride on their own
  `line_items[N].metadata` instead.

## 7. Not in this slice

- **The SC7s additional-side coupon** (spec § 8.3) — the per-count coupons, the
  `EXTRASIDE` promotion code, the `provision-stripe-catalog.mjs` extension, and
  the retirement of the `sc7s-*-additional-side` products. This ticket builds no
  `discounts`.
- **Donation `submit_type`** (spec § 8.4) — `'pay'` vs `'donate'`, and the
  standalone pay-what-you-want session.
- **The catalog clean-ups** spec § 3 lists as target state:
  `findCatalogItemsForProduct`'s prefix fallback and the two additional-side
  items. They belong with the coupon work above, not here.

## 8. Verification

**Verified**

- **Offline**, through `pnpm checkout:round-trip`
  (`scripts/checkout-pricing-round-trip.ts`): the sale window's in/out/boundary/
  half-authored cases, every refusal code, and the whole metadata surface
  including the truncation and >50-key overflow. No credentials needed. This is
  where criterion 4's _resolution_ is proved — which price id is chosen.
- **Criterion 1** by hand, against embedded Checkout on a local dev server.
- **Criterion 3's server half** (2026-09-23, against the local dev server): a cart
  holding a valid line beside `donation-club-preset-25` and an unknown sku answers
  `409` from **both** `/api/checkout/cart` and `/api/checkout/sessions`, with one
  error per offending line — `unknown-product` and `unknown-sku`, each carrying
  the entry id the buyer removes — and the valid line appears in no error. The
  refusal writes no `carts` row: the 409 precedes the snapshot write.
- **Criterion 2's metadata half** (2026-09-23, a test-mode session read back with
  `line_items.data.price.product` expanded): the session carried
  `families=events`, `reg_count=0` and `reg_ref=<cartRef>`, and each generated line
  item's Product carried `metadata={"family":"events"}` — so `order_lines.family`
  and `orders.families` read correctly locally too. The PaymentIntent does not
  exist until the buyer begins paying, so its copy is a live-pass check.

**Outstanding**

- The `sold-out` code specifically: no `product` record is `in_stock: false` on
  the published environment, so the branch cannot be triggered without publishing
  a CMS edit. It is asserted offline, and it shares its contract with the two
  refusals verified above.
- Criterion 3's **UI** half — the row in the flyout and the row on the checkout
  page, each with its one-click remove — has not been exercised by hand.
- Criterion 2's `sku` on the order row (generated in test mode), criterion 4's
  charged amount, and criterion 5's thumbnails: live mode. For criterion 4 the
  session can be **created and retrieved** with `line_items.data.price` expanded
  without paying, which shows which Price the window chose; only the charge itself
  needs money.
