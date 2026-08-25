-- Create the `orders` table for the website Supabase project
-- (project ref: knqlsiuhdcflazlnefob).
--
-- Canonical order record for every purchase, with an optional registration
-- payload for form-carrying orders (golf outing, tournament).
--
-- Write path: one shared recordOrder (webhook authoritative + return-page fast
-- path), first-writer-wins upsert keyed by session_id
-- (insert ... on conflict (session_id) do nothing). Event-driven status
-- updates (async payments, refunds, expirations) land later as targeted
-- DO UPDATE handlers.
--
-- Amounts are the smallest currency unit (cents), mirroring Stripe.

create table public.orders (
  session_id          text primary key,            -- Stripe Checkout Session id (cs_...)
  client_reference_id text,                        -- cartRef; joins the registration payload back
  flow                text,                        -- golf | tournament | dues | donation | membership; null when unknowable (Payment Link)
  currency            text not null,               -- iso code, e.g. 'usd'
  amount_total        bigint not null,             -- cents
  amount_tax          bigint,                      -- cents; captured at record time while available (not derivable later)
  payment_status      text,                        -- paid | unpaid | no_payment_required | processing (mirrors Stripe)
  session_status      text,                        -- open | complete | expired | abandoned (mirrors Stripe)
  customer_email      text,
  customer_name       text,
  line_items          jsonb not null default '[]'::jsonb,  -- [{description, quantity, unit_amount, amount_total, sku}]
  registration        jsonb,                       -- golf/tournament form payload; null otherwise
  shipping            jsonb,                       -- reserved for shipping_address_collection
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index orders_client_reference_id_idx on public.orders (client_reference_id);
create index orders_created_at_idx on public.orders (created_at desc);

comment on table public.orders is
  'Canonical order record for every purchase; optional registration payload for form-carrying orders (golf, tournament).';

-- RLS: the Next.js server writes via the service role key (which bypasses
-- RLS). With no policies, anon/authenticated clients get nothing. Add an
-- authenticated policy only when an admin read path exists — not now.
alter table public.orders enable row level security;
