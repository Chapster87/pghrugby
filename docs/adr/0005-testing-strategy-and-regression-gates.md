# Testing strategy and post-launch regression gates

The site is live, so development *after* launch has to catch its own regressions
without ever touching production data. We run **Vitest** for the pure and
integration layers and **Playwright** for the buy path, against a **local
ephemeral Supabase** (Docker, seeded from `supabase/migrations/`) and Stripe test
mode, gated by **GitHub Actions** on pull requests into `trunk` and pushes to
`trunk`; a **read-only smoke** runs against the production deploy after it
publishes, and a nightly job backstops drift. Tests never write to the production
database, and never run inside the Netlify build. Tracked by the
[testing-foundation map](https://github.com/Chapster87/pghrugby/issues/126).

## Considered options

- **A hosted test Supabase project.** Rejected in favour of the local stack: the
  site's only Supabase surface is `orders` / `carts`, which `supabase/migrations/`
  fully defines, so a disposable container reproduces everything the write path
  needs — no second project to create, migrate, or pay for.
- **Writing marked test rows to production and cleaning them up afterwards.**
  Rejected: the club reports from that table, a failed cleanup leaves garbage,
  and "is production broken?" becomes entangled with "did the tests clean up?".
- **Running tests inside the Netlify build.** Rejected: it conflates "tests
  failed" with "deploy failed" and cannot run a browser cleanly.

## Consequences

- **Trunk stays green.** A red PR gate blocks merge; the author whose change broke
  it owns the fix. One Playwright retry is allowed on CI, but any flake is filed
  as a bug rather than silently retried.
- **Stripe isolation is free.** Branch deploys and Deploy Previews already run
  test Stripe permanently ([ADR-0001](0001-two-branch-release-topology-and-site-origins.md));
  only `production` touches live Stripe.
- The six home-grown `scripts/*-round-trip.ts` checks are **replaced** by the
  Vitest suites, not kept alongside them.
- The suite depends on Docker (the local Supabase stack) and the Supabase CLI, so
  both a laptop and CI need them present.
- The read-only production smoke is bound by contract: it may never write an
  order or hit a mutating endpoint.
