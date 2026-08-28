# Context Map

This map defines the domain contexts in the repository.

## Contexts

### pghrugby (the whole repo)

- **Path**: `.` (repo root — the Next.js app is flattened to the root)
- **Description**: Next.js app for the Pittsburgh Forge Rugby Club — marketing
  pages, editorial posts, and Stripe-backed buyable flows. Consumes Stripe,
  DatoCMS, ForgeCMS, Sanity (legacy), and Supabase (`orders`/`carts`).
- **Context File**: `CONTEXT.md`
- **Agent docs**: `docs/agents/`; **handoffs**: `docs/handoffs/`
- **ADRs**: `docs/adr/` (if/when added)

## Retired contexts

- **pghrugby-store** (Medusa backend) — archived on GitHub and removed locally
  as part of the Medusa removal; the Railway services it ran on are being
  decommissioned.
- **Strapi** — abandoned CMS experiment, deleted.
