# Handoff: cms-starter prep to work alongside the pghrugby embed

For the owner to kick off a **wayfinder chart-the-map session in the `cms-starter`
repo** so ForgeCMS is prepared to be embedded into — and cleanly pulled from — a
consumer site like pghrugby. This is the CMS-side mirror of the pghrugby-side map
[Wayfinder map: Embed the ForgeCMS content software into the pghrugby app](https://github.com/Chapster87/pghrugby/issues/40).

## Where this sits

Two cooperating maps, one per repo:

- **Consumer side (this repo, `pghrugby`):** the map above — embed ForgeCMS into
  pghrugby's own Next.js app (same server/build/DB), vendored **core** that advances
  cleanly from `cms-starter`, plus a **thin site-specific layer** for custom models
  (standings). Cleanly pulling core updates is the top priority. Carries execution.
  Out of scope there: `cms-starter` internal architecture.
- **Producer side (`cms-starter`):** this effort — make ForgeCMS a *good upstream*:
  a core whose layout, extension seam, and sync contract make that embed + pull
  natural for any consumer site. Out of scope here: consumer site content/data.

Neither map decides for the other; they meet at the boundary the consumer design
assumes. This handoff states what the consumer side is counting on, so the producer
map can decide how to provide it.

## Consumer-side decisions already locked (pghrugby map #40)

- Destination (carries execution): ForgeCMS software is embedded into pghrugby's own
  Next.js app — same server, build, DB as the site. The separately-running ForgeCMS is
  retired for that site. Content DB is already shared (the site's Supabase project);
  only the management *software* moves in.
- The embedded copy is a **vendored core advanced wholesale from `cms-starter`** (a
  single, deterministic "pull core updates" command — clean updates matter more than
  add-on flexibility), plus a **thin site-specific layer** for custom models such as
  standings that must **not** live in the core.
- Stack parity confirmed: cms-starter (Next 16.2.1 App Router / React 19 / pnpm /
  Supabase) and pghrugby (Next 16.3.3 / React 19 / pnpm / Supabase) are structurally
  mergeable.
- cms-starter is public (`Chapster87/cms-starter`), reachable via `gh`; the consumer
  pull tooling can target it as the upstream ref.

## Open consumer tickets the CMS side must not accidentally break

- [Research: Map the ForgeCMS integration surface](https://github.com/Chapster87/pghrugby/issues/41)
  — will inventory cms-starter's routes, DB schema/migrations, auth, media, env, and
  collisions. It reads cms-starter as-is; findings feed both sides.
- [Grilling: Embedded mount and routing strategy](https://github.com/Chapster87/pghrugby/issues/42)
  — expects cms-starter's page/API routes to be **mountable/prefixable** inside a
  host app without colliding (both own `api/graphql`, `auth`, root layout, etc.).
- [Grilling: Vendor core, pull-updates, and site-layer architecture](https://github.com/Chapster87/pghrugby/issues/43)
  — assumes a clean **core boundary** and a defined way for a consumer to add
  site-specific models/UI without contaminating core, so pulls stay clean.

## What the producer side should figure out (the CMS-side questions)

Suggested frontier for the cms-starter wayfinder map. Sharpness test: these are
questions, not answers — the session should name the destination and map breadth-first.

1. **Core boundary.** What, structurally, *is* the "core" of ForgeCMS (the files,
   route groups, schema, tooling that every consumer pulls)? What is provably not core
   (site/consumer-specific) and must never land upstream?
2. **Extension/add-on seam.** How does a consumer add a custom model *and its admin
   surface* (e.g. the standings tables: model + fields + any custom editor UI/route)
   without editing core — so a pull never conflicts with it? Is there an extension
   mechanism the core should provide, and what must core do to support it?
3. **Migration/schema shipping.** How do content-schema migrations ship from core and
   apply to a consumer's DB (each consumer runs its own Supabase project)? How do
   consumer-added models stay separate from core's migration stream?
4. **Sync/pull contract.** What does "pullable core" mean in cms-starter terms — the
   layout and guarantees a consumer's pull command can rely on? Should pull/sync
   tooling live upstream (authored once, reused by consumers) or consumer-side? Decide
   the ownership boundary so the two maps don't double-build it.
5. **Runnability posture.** cms-starter stays a runnable standalone template *and*
   becomes an embeddable core. How do those two shapes coexist (they are not the same
   layout problem)?

## Explicitly out of scope for the producer map

- pghrugby content or data (already lives in the shared DB; not migrating).
- The consumer-side embed itself — that is pghrugby map #40's execution.
- The ForgeCMS junk content/models cleanup (carried on pghrugby map #1).

## Working agreement between the two maps

- **Refer by name, link by number.** The two maps should reference each other's
  tickets by name with links, never by bare numbers.
- **Meet at the boundary.** If a decision on one side presumes a capability on the
  other, surface it as a named dependency (link the ticket) rather than silently
  assuming — and prefer making it a crisp question for the other map to answer.
- **Don't resolve the other side.** A producer ticket is not resolved by doing
  consumer work, and vice versa.
