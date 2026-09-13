# Order records and reporting: per-line registrations, families, Dashboard split

Status: **decided 2026-09-13** for
[Grilling: Orders + reporting shape for mixed carts](https://github.com/Chapster87/pghrugby/issues/60)
on
[Wayfinder map: Multi-product PDP to minicart to checkout](https://github.com/Chapster87/pghrugby/issues/54).

This fixes the durable order record and the Stripe-side reporting surface once a
cart spans PDPs and carries per-line registration. It **replaces** the single
`orders.registration` blob, the single `orders.flow` slug, and the
`orders.line_items` jsonb in `src/lib/checkout/record-order.ts` and the orders
migrations, and it **replaces** `carts.flow` / `carts.registration` /
`carts.line_items` in `src/lib/checkout/cart-store.ts`. It **pins** the `reg_ref`
value sketched in
[Research: Stripe metadata + product-image mechanics](https://github.com/Chapster87/pghrugby/issues/55)
(`docs/agents/stripe-checkout-registration-metadata.md`).

## 1. Orders become a header plus two child tables

The roster/aggregate jobs the club wants are `group by` and `join` jobs, so the
registration data must be **rows**, not a blob nested in one jsonb column.

```
orders                 (header: identity, amounts, statuses, customer)
  session_id          text primary key          -- Stripe Checkout Session id (cs_...)
  client_reference_id text                      -- cartRef; null for cartless orders
  currency            text not null
  amount_total        bigint not null           -- cents
  amount_tax          bigint
  payment_status      text                      -- paid | unpaid | no_payment_required | processing
  session_status      text                      -- open | complete | expired
  payment_intent_id   text                      -- refund reconciliation key (kept)
  refunded_amount     bigint not null default 0 -- kept
  refund_status       text not null default 'none' -- kept
  customer_email      text
  customer_name       text
  shipping            jsonb
  families            text[] not null default '{}'  -- replaces `flow`; see § 3
  created_at          timestamptz not null default now()
  updated_at          timestamptz not null default now()
  -- dropped: flow, line_items, registration

order_lines            (one row per priced line = one Stripe line item)
  id              text primary key       -- `${session_id}:${line_index}` (deterministic)
  session_id      text not null references orders(session_id)
  line_index      integer not null       -- 0-based over priced lines
  unique (session_id, line_index)
  sku             text                   -- Stripe product id (price.product.id), as today
  description     text
  quantity        integer not null
  unit_amount     bigint                 -- cents
  amount_total    bigint not null        -- cents
  family          text                   -- price.product.metadata.family; null when none (§ 3)
  source_pdp      text                   -- from the cart entry; null for cartless orders
  parent_line_id  text references order_lines(id)  -- null; an add-on's primary line

order_registrations    (one row per collector entry; at most one per line)
  id              text primary key       -- `${session_id}:${line_index}` of its primary line
  session_id      text not null references orders(session_id)
  line_id         text not null unique references order_lines(id)
  collector_ref   text                   -- DatoCMS data_collector record id
  fields          jsonb                  -- snapshot of the collector's field defs at add-time (#58)
  answers         jsonb                  -- the raw payload (`captainName`, `golfers[]`, `teamName`, …)
  summary         text                   -- the #55 human string that rides in `reg_N`
  source_pdp      text
```

- **How a registration ties to its line:** `order_registrations.line_id` →
  `order_lines.id`; the line itself is identified by its **`line_index`**, which
  is exactly the positional scheme `reg_N` metadata already uses. One join key,
  consistent across Stripe and Postgres. A line bears **at most one**
  registration (`unique (line_id)`) — a registration-bearing line never merges
  and every add creates one line plus one collector entry (`cart-line-model.md`
  § 2).
- **Futureproofing is what we *store*, not what we compute.** `answers` (raw)
  and `fields` (the add-time snapshot) are both persisted, so a future per-person
  or per-team derivation is a *query*, not a re-migration. We do **not** explode
  names into their own table in this slice — there is no uniform "person" concept
  across collectors (golf's `golfers[]` vs SC7s's `teamName`/`contactName`).
- **`family` is `text`, not a Postgres enum.** Adding a family later (e.g. an
  `event` bucket for the one-off fundraisers) is a Stripe-metadata change plus a
  backfill, never a schema migration.
- **Idempotency holds.** Deterministic ids (`${session_id}:${line_index}`) plus
  `insert … on conflict do nothing` preserve the first-writer-wins contract the
  webhook + success-page race depends on.
- **RLS:** the new tables are RLS-enabled with zero policies, service-role only —
  same as `orders` / `carts`.

## 2. Carts stay a single snapshot

```
carts
  cart_ref   text primary key
  currency   text not null
  entries    jsonb not null            -- the flat cart entry list, verbatim
  total      bigint not null           -- server-computed display snapshot
  created_at timestamptz not null default now()
  -- dropped: flow, line_items, registration
```

Each element of `entries` is the settled cart-line shape
(`docs/agents/cart-line-model.md` § 1 + `docs/agents/registration-editing.md`
§ 7): `PricedLine { id, kind:"product", sku, quantity, sourcePdp, groupRef, parentId? }`
and
`CollectorEntry { id, kind:"collector", collectorRef, answers, fields, sourcePdp, groupRef, parentId }`.

- `carts` has exactly two jobs — let `POST /api/checkout/sessions` build the
  session, and let `recordOrder` rebuild the line/registration rows. Both need
  the **entry list**, not amounts. It is transient (the checkout snapshot), so a
  single jsonb column beats a second normalized write path. The durable,
  queryable shape lives on the `orders` side (§ 1).
- **No resolved amounts on the snapshot.** Prices are re-resolved at session
  build (price drift, per `docs/agents/pdp-pricing-and-sale-windows.md`), and
  `order_lines.unit_amount` comes from the Stripe session, never from this row.
  `total` stays purely as the `/cart` display figure.
- `flow` is gone: each entry carries its own `sourcePdp`.

## 3. `flow` → `families`

- `deriveFlow` (the *first* line item's family, one value) is **replaced** by
  `deriveFamilies(session)` — the distinct `price.product.metadata.family` across
  **all** line items. It is read from the session for every order, cart or
  cartless, so memberships and the standalone donation classify identically.
- `orders.families text[]` holds the **known** families the order touched;
  `'{}'` means none known (an orphan-only order, or a product with no family
  metadata). Nothing reads `orders.flow` today (it is write-only), so this is a
  clean repurpose.
- The five canonical families stay `membership | dues | golf | tournament |
  donation` (`docs/agents/stripe-catalog-spec.md` § 4). The four one-off
  fundraisers (pig roast, ballpark, survivor pool, bar crawl) keep
  **`family = null`** and are reported **by sku/product**; no sixth family is
  invented. A future `event` bucket is a catalog change, not a schema change.

## 4. Stripe-side metadata

Session `metadata` **and** `payment_intent_data.metadata` (the Dashboard payment
page is the PaymentIntent):

| Key | Value |
| --- | --- |
| `families` | distinct families joined, e.g. `"golf,dues,donation"` — **replaces `flow`** |
| `reg_N` | one per priced line at position `N` (= `line_index`); a non-registration line **inherits its primary's registrants** via `parentId`, and a line with no primary (dues, donation) gets none |
| `reg_count` | number of registrations in the order |
| `reg_ref` | the `client_reference_id` (cartRef) — the trace-back key into `orders` → child rows (**pins** #55's "orders row id / cartRef") |

Inherited limits, not re-opened: 50 keys per object (a >50-line cart overflows
into `line_items[].metadata`, per #55) and 500-char values.

## 5. Where the club reports

| Job | Surface | How |
| --- | --- | --- |
| "Did this payment go through, and who was on it?" | **Stripe Dashboard** | `payment_intent_data.metadata`: `families`, `reg_N`, `reg_count`, `reg_ref` |
| "Every golfer/team/registrant this season" (roster, someday) | **Our DB** | `order_registrations` (+ `fields`/`answers`) joined to `order_lines` |
| "Units and revenue by family / product" | **Our DB** | `order_lines group by family \| sku` |
| "Find a person's registration" (lookup, likely) | **Our DB** | query `order_registrations.answers`, reached from `orders.client_reference_id` / `reg_ref` |
| Day-to-day payment/refund admin | **Stripe Dashboard** | unchanged built-in reports, refunds, the `families` search |

- **No new club-facing reporting UI is built in this map.** The durable rows are
  the contract; the read paths (admin order portal + transactional email) are
  already parked as [Order records portal + transactional email](https://github.com/Chapster87/pghrugby/issues/67).
- The club's **ForgeCMS admin view** is a *future* read path, not this map: the
  website and ForgeCMS share one Supabase project (`docs/agents/supabase-postgrest.md`),
  so a connector can register these plain relational tables as ForgeCMS models —
  which is another reason the shape is rows, not jsonb.
- The one read surface we do touch is **buyer-facing**: `/checkout/success`
  renders `order.registration` today (`RegistrationDetails`); it must instead
  render the registration rows grouped by their line. That is a contract for
  [Task: Assemble the PDP to minicart to checkout spec](https://github.com/Chapster87/pghrugby/issues/66)
  to build, not a new UI.

## 6. Migration / rollout

There is **no historical order data** to preserve — this is net new. So the
migration **drops** `orders.flow` / `orders.line_items` / `orders.registration`
and `carts.flow` / `carts.line_items` / `carts.registration`, and adds the
columns + tables above — with **no backfill**. The migration mechanics ride with
the spec/rollout tickets
([Task: Assemble the PDP to minicart to checkout spec](https://github.com/Chapster87/pghrugby/issues/66),
[Grilling: Rollout of the new PDP to minicart to checkout flow](https://github.com/Chapster87/pghrugby/issues/61)),
not decided here beyond "drop, no backfill".

## 7. Amendments

- **`docs/agents/cart-line-model.md` § 7** — the deferred "Order + reporting
  persistence of collector entries as first-class rows linked to their line" is
  resolved here.
- **`docs/agents/stripe-checkout-registration-metadata.md`** — `reg_ref` is
  pinned to `client_reference_id` (cartRef).
