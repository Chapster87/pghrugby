-- PROTOTYPE — `orders` table for the website Supabase project.
-- Answering wayfinder ticket #11: how should the canonical order record +
-- optional registration payload be shaped? Throwaway until the verdict lands.
--
-- Amounts are the smallest currency unit (cents), mirroring Stripe. The table
-- is written by the Next.js server (service role) on `checkout.session.completed`
-- and from the return page; see README.md for the write-path semantics.

create table if not exists public.orders (
  session_id          text primary key,          -- Stripe Checkout Session id (cs_...)
  client_reference_id text,                      -- cartRef; joins the registration payload back
  flow                text,                      -- golf | tournament | dues | donation | membership; null when unknowable (Payment Link)
  currency            text not null,             -- iso code, e.g. 'usd'
  amount_total        bigint not null,           -- cents
  amount_subtotal     bigint,                    -- cents; null if not recorded
  amount_tax          bigint,                    -- cents; populated once Stripe Tax is enabled
  payment_status      text,                      -- paid | unpaid | no_payment_required | processing (mirrors Stripe)
  session_status      text,                      -- open | complete | expired | abandoned (mirrors Stripe)
  customer_email      text,
  customer_name       text,
  line_items          jsonb not null default '[]'::jsonb,  -- [{description, quantity, amount_total}]
  registration        jsonb,                     -- golf/tournament form payload; null otherwise
  shipping            jsonb,                     -- reserved for shipping_address_collection
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists orders_client_reference_id_idx
  on public.orders (client_reference_id);

create index if not exists orders_created_at_idx
  on public.orders (created_at desc);

-- RLS: the Next.js server writes via the service role key, which bypasses RLS.
-- With no policies, anon/authenticated clients get nothing. If an admin read
-- path is ever needed, add an `authenticated` policy then — not now.
alter table public.orders enable row level security;
