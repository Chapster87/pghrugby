-- Reshape cart and order storage for the mixed-cart PDP -> minicart -> checkout
-- flow (website Supabase project, ref knqlsiuhdcflazlnefob).
--
-- `carts` becomes a single `entries` jsonb snapshot — the flat PricedLine /
-- CollectorEntry list, verbatim. `orders` becomes a header plus `order_lines`
-- and `order_registrations`, so registrations are queryable rows (a `group by`
-- / `join` job) rather than a blob nested in one column.
--
-- There is **no historical data to preserve** — the site is not live — so this
-- drops the legacy columns with **no backfill**. The database is forward-only:
-- a rollback is a restore from backup, not a down-migration.
--
-- Write path (unchanged in spirit): one shared `recordOrder` (webhook
-- authoritative + return-page fast path), first-writer-wins on deterministic
-- ids via `insert ... on conflict do nothing`.
--
-- See `docs/agents/order-records-and-reporting.md` and
-- `docs/pdp-to-minicart-to-checkout-spec.md` § 9.

-- ---------------------------------------------------------------------------
-- carts — the checkout snapshot: one entry list, no resolved amounts --------
-- ---------------------------------------------------------------------------

alter table public.carts
  drop column flow,
  drop column line_items,
  drop column registration;

alter table public.carts
  add column entries jsonb not null default '[]'::jsonb;

comment on column public.carts.entries is
  'The flat cart entry list, verbatim: PricedLine { id, kind:"product", sku, quantity, sourcePdp, groupRef, parentId? } and CollectorEntry { id, kind:"collector", collectorRef, answers, fields, sourcePdp, groupRef, parentId }. Carries no resolved amounts — prices are re-resolved at session build.';

comment on table public.carts is
  'Checkout snapshot: the browser-held entry list, replayed at session build and read back by recordOrder. Transient; retention is an open follow-up.';

-- ---------------------------------------------------------------------------
-- orders — header: identity, amounts, statuses, customer, families ----------
-- ---------------------------------------------------------------------------

alter table public.orders
  drop column flow,
  drop column line_items,
  drop column registration;

-- `flow` (the first line item's family, one value) is replaced by the distinct
-- families across every line item, so memberships and the standalone donation
-- classify identically. '{}' means none known. The known families stay
-- membership | dues | golf | tournament | donation; the one-off fundraisers
-- keep family = null and are reported by sku/product.
alter table public.orders
  add column families text[] not null default '{}';

comment on column public.orders.families is
  'Distinct Stripe product families the order touched (membership | dues | golf | tournament | donation); ''{}'' means none known. Replaces the single-valued flow slug.';

-- ---------------------------------------------------------------------------
-- order_lines — one row per priced line (= one Stripe line item) -------------
-- ---------------------------------------------------------------------------

create table public.order_lines (
  id             text primary key,                                    -- `${session_id}:${line_index}` (deterministic)
  session_id     text not null references public.orders (session_id),
  line_index     integer not null,                                    -- 0-based over priced lines; the reg_N join key
  sku            text,                                                -- Stripe product id (price.product.id)
  description    text,
  quantity       integer not null,
  unit_amount    bigint,                                              -- cents
  amount_total   bigint not null,                                     -- cents
  family         text,                                                -- price.product.metadata.family; null when none
  source_pdp     text,                                                -- from the cart entry; null for cartless orders
  parent_line_id text references public.order_lines (id),             -- null; an add-on's primary line
  unique (session_id, line_index)
);

create index order_lines_session_id_idx on public.order_lines (session_id);
create index order_lines_parent_line_id_idx on public.order_lines (parent_line_id);

comment on table public.order_lines is
  'One row per priced line, in Stripe line-item order. `line_index` is the positioning the reg_N metadata scheme already uses, so one join key is consistent across Stripe and Postgres.';

comment on column public.order_lines.family is
  'Stripe product family metadata; null when the product carries none (the four one-off fundraisers), never defaulted.';

comment on column public.order_lines.parent_line_id is
  'On an add-on line: the primary line it was added with. Null on a plain or primary line. Insert primaries before add-ons so the self-reference resolves.';

-- ---------------------------------------------------------------------------
-- order_registrations — one row per collector entry (at most one per line) --
-- ---------------------------------------------------------------------------

create table public.order_registrations (
  id            text primary key,                                     -- `${session_id}:${line_index}` of its primary line
  session_id    text not null references public.orders (session_id),
  line_id       text not null unique references public.order_lines (id),
  collector_ref text,                                                 -- DatoCMS data_collector record id
  fields        jsonb,                                                -- add-time field-definition snapshot
  answers       jsonb,                                                -- raw payload (captainName, golfers[], teamName, …)
  summary       text,                                                 -- the human string that rides in reg_N
  source_pdp    text
);

create index order_registrations_session_id_idx on public.order_registrations (session_id);

comment on table public.order_registrations is
  'One row per collector entry, linked to its primary line. Both `answers` (raw) and `fields` (the add-time snapshot) are persisted, so a future per-person / per-team derivation is a query, not a re-migration. A line bears at most one registration (unique line_id).';

-- RLS: the Next.js server writes via the service role key (which bypasses RLS).
-- With no policies, anon/authenticated clients get nothing — same as orders/carts.
alter table public.order_lines enable row level security;
alter table public.order_registrations enable row level security;
