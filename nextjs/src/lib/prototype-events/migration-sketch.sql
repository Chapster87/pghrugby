-- PROTOTYPE — draft migration for the Stripe event edge cases prototype.
-- Do NOT apply. Sketch for the human to react to; final shape depends on the
-- prototype verdicts (refund representation, expired-session policy).
--
-- Adds the columns the deferred event handlers need:
--   payment_intent_id — the only reconciliation key refund events carry
--   refunded_amount   — accumulated refunded cents
--   refund_status     — none | pending | partial | refunded
--   refunds           — optional per-refund JSONB detail (only if per-refund
--                       tracking survives the verdict)

alter table public.orders
  add column payment_intent_id text,
  add column refunded_amount   bigint not null default 0,
  add column refund_status     text not null default 'none',
  add column refunds           jsonb;

comment on column public.orders.payment_intent_id is
  'Stripe PaymentIntent id — captured at first write; the only way to reconcile charge.refunded / refund.* events (PaymentIntent has no reverse link to its Checkout Session).';

comment on column public.orders.refund_status is
  'none | pending | partial | refunded — derived from refunded_amount vs amount_total.';

create index orders_payment_intent_id_idx on public.orders (payment_intent_id);
