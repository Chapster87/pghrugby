# Prototype verdict — Stripe event edge cases

PROTOTYPE — resolved. Full discussion in
[Prototype: Stripe event edge cases (async payments, refunds, expired sessions) #23](https://github.com/Chapster87/pghrugby/issues/23).

Question: how should the orders write path handle async payments, refunds, and
expired sessions — and when does the first-writer-wins `DO NOTHING` upsert
switch to `DO UPDATE` status transitions?

Verdict (2026-08-26):

- **Cards only** on the live account → `processing`/`async_payment_*` handling is
  implemented but dormant.
- **Refunds aggregate-only**: `refunded_amount` + `refund_status`
  (`none | partial | refunded`) via `charge.refunded`, reconciled by a new
  `payment_intent_id` column. No `refunds` JSONB, no `refund.updated` handling.
- **Expired sessions dropped**: acked, no row. The return page must not insert
  rows for non-complete sessions (a stale/expired session_id must not create an
  order row).
- **Write path**: `recordOrder` stays `insert ... on conflict (session_id) do
  nothing` (frozen: identity, amounts, line items, customer, shipping,
  registration, amount_tax, `payment_intent_id`); every later event is a
  targeted `DO UPDATE` on the mutable status columns only.
- **Return page**: winner = hero header + order receipt + styled registration on
  a white rounded container; branches on `payment_status`.

Absorb into the webhook / `record-order.ts` / `/checkout/success`
([Task: Webhook edge-case handlers and orders migration](https://github.com/Chapster87/pghrugby/issues/25)),
then delete this directory and the `/prototype/success` route.
