# Pittsburgh Forge Rugby Club — pghrugby

The public site for the Pittsburgh Forge Rugby Club: marketing pages, editorial
posts, and Stripe-backed buyable flows (dues, registrations, donations).

Built with Next.js (App Router), with content and commerce spread across:

- **Stripe** — catalog, prices, embedded Checkout, and the
  `checkout.session.completed` webhook (live product data is provisioned via
  `scripts/provision-stripe-catalog.mjs`).
- **DatoCMS** — editorial content (pages, posts) plus interim product content
  and taxonomy.
- **ForgeCMS** — site chrome + competition (nav, footer, settings, sponsors,
  teams, matches, schedules, standings, links, socials).
- **Sanity** — legacy nav/footer/posts source until the migration tickets land
  (see the wayfinder map, issue #1).
- **Supabase** — the `orders` table (and `carts`), written service-role only.

The repo is self-contained at its root — the Next.js app, `src/`, `scripts/`,
`sanity.config.ts`, `schema.graphql` (generated DatoCMS schema), `supabase/`,
and the WordPress→CMS `migrations/` all live here. `migrations/` is preserved
until the WordPress content migration is confirmed landed.

## Setup

```bash
pnpm install
```

Populate `.env.local` with the required values. The required runtime set is
documented in `docs/agents/environment-secrets-inventory.md` § 3.1. A missing
key logs a warning (local dev runs with a partial env).

## Running

```bash
pnpm dev        # http://localhost:8000
pnpm build      # production build (types/lint are skipped; see note below)
pnpm start      # serve the production build
```

## Scripts

| Command                                            | Purpose                                                                                   |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `pnpm generate-schema`                             | Regenerate the DatoCMS GraphQL schema (`schema.graphql`)                                  |
| `pnpm generate-typings`                            | Regenerate gql.tada types                                                                 |
| `pnpm provision:stripe` / `provision:stripe:apply` | Dry-run / apply the live Stripe catalog from the approval checklist                       |
| `pnpm scan:woocommerce`                            | Scan the live WordPress site for the catalog build                                        |
| `pnpm legacy-pages:cleanup`                        | Dry-run verification of legacy DatoCMS pages; `--apply` deletes shadowed/orphaned records |
| `pnpm prototype:datocms-models`                    | Run the DatoCMS product-model prototype                                                   |

## Notes

- TypeScript errors and lint are ignored during builds (`next.config.js`) while
  the pre-existing error backlog is resolved — fix them, don't rely on this.
- The `[slug]` page prerenders every published DatoCMS page; a known Next.js
  prerender flakiness can surface in `next build` (restarting the build is the
  workaround while the page set is large).
- `nextjs/` was flattened into the repo root as part of the Medusa removal; any
  stale `pghrugby/nextjs/...` path in older docs is historical.
