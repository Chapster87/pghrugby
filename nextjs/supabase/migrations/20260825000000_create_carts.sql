-- Create the `carts` table for the website Supabase project
-- (project ref: knqlsiuhdcflazlnefob).
--
-- Server-authoritative carts built by POST /api/checkout/cart and replayed by
-- POST /api/checkout/sessions. Replaces the prototype spike's in-memory store
-- (which lost carts on dev-server restart); the webhook re-joins the
-- registration payload through client_reference_id -> cart_ref.
--
-- Write path: the Next.js server via the service role key (same as `orders`).
-- RLS enabled with zero policies; anon/authenticated clients get nothing.

create table public.carts (
  cart_ref      text primary key,             -- the reconciliation key (client_reference_id)
  flow          text not null,                -- dues | golf | tournament (cart-derived)
  currency      text not null default 'usd',  -- iso code
  line_items    jsonb not null default '[]'::jsonb,  -- [{sku, label, unit_amount, quantity}]
  total         bigint not null,              -- cents; sum of line items
  registration  jsonb,                        -- flow-specific form payload (golf/tournament); null otherwise
  created_at    timestamptz not null default now()
);

create index carts_created_at_idx on public.carts (created_at desc);

comment on table public.carts is
  'Server-authoritative carts awaiting a Checkout Session; registration payload rides beside the session (never in Stripe metadata).';

-- RLS: the Next.js server writes via the service role key (which bypasses RLS).
-- With no policies, anon/authenticated clients get nothing.
alter table public.carts enable row level security;
