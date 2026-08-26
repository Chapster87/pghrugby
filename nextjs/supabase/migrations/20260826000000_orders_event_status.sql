-- Extend the `orders` table for the deferred Stripe event handlers
-- (async payments, refunds, expired sessions) on the website Supabase project
-- (project ref: knqlsiuhdcflazlnefob).
--
-- Locked by the Stripe event edge-cases prototype: `recordOrder` stays
-- first-writer-wins `insert ... on conflict (session_id) do nothing` (frozen at
-- first write: identity, amounts, line items, customer, shipping, registration,
-- amount_tax, payment_intent_id); every later event is a targeted
-- `do update` on the mutable status columns only.

-- payment_intent_id — the only reconciliation key refund events carry
-- (charge.refunded references a PaymentIntent; a PaymentIntent has no reverse
-- link to its Checkout Session). Captured at first write by recordOrder.
alter table public.orders
  add column payment_intent_id text;

comment on column public.orders.payment_intent_id is
  'Stripe PaymentIntent id — captured at first write; the only way to reconcile charge.refunded events (no PaymentIntent → Checkout Session reverse link).';

create index orders_payment_intent_id_idx on public.orders (payment_intent_id);

-- Aggregate refund state. charge.refunded is the only refund event handled —
-- no per-refund JSONB, no refund.* subscriptions.
alter table public.orders
  add column refunded_amount bigint not null default 0,
  add column refund_status text not null default 'none';

comment on column public.orders.refunded_amount is
  'Accumulated refunded cents (charge.amount_refunded), written by charge.refunded.';

comment on column public.orders.refund_status is
  'none | partial | refunded — aggregate, derived from the charge on charge.refunded.';

-- Comment fix: 'abandoned' is not a Stripe value (session status enum is
-- open | complete | expired).
comment on column public.orders.session_status is
  'open | complete | expired (mirrors Stripe)';
