# Prototype — `orders` table schema + webhook write path

Throwaway artifact answering wayfinder ticket **Prototype: Orders and
registrations table schema** (#11 on `Chapster87/pghrugby`): _how should the
orders table in the website Supabase project be shaped — a canonical order
record for every purchase (checkout session id, customer email/name, line
items, amounts, status, timestamps) with an optional registration payload for
form-carrying orders (golf outing, tournament)?_

Three artifacts, all marked PROTOTYPE:

- `schema.sql` — the proposed `orders` DDL (with RLS). **This is the thing to
  react to.**
- `orders-logic.ts` — the portable, pure logic: the shared `recordOrder`
  (webhook + return-page fast path) with idempotent upsert semantics keyed by
  session id. Liftable into the real checkout module.
- `tui.ts` — the throwaway interactive shell that pushes the logic through the
  hard cases.

Follows the spike (#10) verdict: one table, session id PK, `client_reference_id`,
flow, amounts, customer email, line items JSONB, nullable registration JSONB,
nullable shipping JSONB.

## Run it

From `pghrugby/nextjs`:

```bash
pnpm prototype:orders
```

Scenario sessions are pre-seeded in a fake Stripe (`cs_dues`, `cs_golf`,
`cs_tournament`, `cs_membership`, `cs_async`). Actions:

| Key       | Meaning                                             |
| --------- | --------------------------------------------------- |
| `w <id>`  | `checkout.session.completed` webhook fires          |
| `f <id>`  | return-page fast path records the order             |
| `d <id>`  | deliver the same webhook twice (duplicate delivery) |
| `p <id>`  | peek the session + joined cart/registration payload |
| `l`       | list full order records                             |
| `x` / `q` | reset store / quit                                  |

Cases to push: `d cs_golf` (idempotency), `w cs_golf` then `f cs_golf`
(race — either order of arrival), `w cs_membership` (no cartRef, flow null),
`f cs_async` then `w cs_async` (first-writer-wins locks in `processing`).

## The write path (what the TUI models)

One shared `recordOrder(sessionId)` for both paths, backed by:

```sql
insert into orders (...) values (...)
on conflict (session_id) do nothing;
```

**First writer wins.** A duplicate webhook delivery is a no-op; the fast path
racing the webhook returns the existing row either way. Rows are identical
whichever path landed first (both retrieve the same Checkout Session) — except
`cs_async`: if the fast path lands while payment is still `processing`, the row
keeps that status because the later webhook can't update it. Fixing that
(`checkout.session.async_payment_succeeded`, and refunds/expirations generally)
is the map's deferred **Stripe event edge cases** work and would switch the
upsert to `DO UPDATE` with targeted status transitions.

## What to react to

1. **Field set.** Keep `amount_subtotal`/`amount_tax` or just `amount_total`?
   Keep both `payment_status` and `session_status`? (Ticket asks for "amounts,
   status" plural; the spike carried a single total and both statuses.)
2. **`flow`.** Derived from the cart via `client_reference_id`; `null` for
   membership Payment Link sessions. Alternatively derive it from line-item
   product metadata (`family` in the catalog spec) at record time — do we care
   enough to?
3. **Line items.** Spike parity (`description`, `quantity`, `amount_total`) or
   enrich with `unit_amount` / product sku (`lookup_key`)? Catalog spec says
   the sku can ride in line-item metadata.
4. **Registration payload.** Free-form JSONB beside the session — golf = captain
   - per-golfer rows; tournament = team name + division + contact. Leave
     untyped, or agree on a per-flow shape?
5. **Upsert semantics.** First-writer-wins (`DO NOTHING`) now; `DO UPDATE`
   status transitions when event edge cases land. Sanity-check the async case
   in the TUI.
6. **RLS.** Enable + zero policies (service-role only). No admin read path yet
   — confirm that's the intent.
7. **Provisioning.** **Who provisions the website Supabase project and runs the
   DDL?** Open — needs the human. (The Supabase project this agent can reach is
   the unrelated roster-builder one; there is no `orders` wiring anywhere in the
   repo yet.)

## Verdict (HITL — landed 2026-08-24)

- **Field set:** `amount_total` (not null) + `amount_tax` (nullable, captured
  while available); **no `amount_subtotal`** — it's the sum of line items, so
  derivable.
- **`flow`:** cart-derived via `client_reference_id` when a cartRef exists;
  cartless sessions (membership Payment Links) fall back to the first line
  item's product `family` metadata — so memberships record as `membership`.
- **Line items:** `{description, quantity, unit_amount, amount_total, sku}`;
  `sku` = Stripe product id from the expanded `price.product` (the same expand
  that feeds the flow fallback). Enables product-level reporting.
- **Registration:** free-form JSONB; the cart builder owns the shape (golf =
  captain + golfers, tournament = team + division + contact). Per-flow shapes
  get pinned in the checkout/registration-form work, not in DDL.
- **Upsert:** first-writer-wins (`insert ... on conflict (session_id) do
nothing`) for both webhook and fast path; `DO UPDATE` status transitions land
  with the deferred Stripe event edge cases (async payments, refunds,
  expirations).
- **RLS:** enabled with zero policies; the Next.js server writes via the
  service role key. Admin read policy only if one is ever needed.
- **Provisioning:** the website Supabase project exists in the same account
  (`knqlsiuhdcflazlnefob`); `.env.local` already carries `SUPABASE_URL` / anon
  key / service role key. The DDL is landed as
  `supabase/migrations/20260824000000_create_orders.sql` at the repo root of
  `pghrugby/nextjs`, applied by the human (`supabase link --project-ref
knqlsiuhdcflazlnefob` + `supabase db push`, or via the Dashboard SQL editor).

Keep the PROTOTYPE artifacts as reference until the checkout module
replacement absorbs the `recordOrder` logic (spike precedent); delete then.
