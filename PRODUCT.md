# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences in close balance, with the emphasis shifting by surface:

- **Prospective players and members** — people deciding whether to join the club.
- **Fans and alumni** — supporters following the club, its news, and its matches.

Secondary audiences the site also serves: current members (dues, registration, club logistics), sponsors and businesses buying sponsorship packages, and donors.

## Product Purpose

The public site for the Pittsburgh Forge Rugby Club: marketing pages, editorial posts, and Stripe-backed buyable flows (dues, registrations, donations, golf outing, Steel City 7s, sponsorship). It replaces the WordPress/WooCommerce "Live store" at cutover. Success means the club presents itself as a real, competitive, historic club and converts interest into membership, attendance, and purchases.

## Positioning

A historic club in a major sports town that fields both a women's and a men's side — a combination that is rare among neighboring clubs — and competes seriously. The dual-side identity and the club's history are the claims a neighboring club could not truthfully copy.

## Operating Context

Content and commerce are split across four systems:

- **Stripe** — catalog, prices, embedded Checkout, and the `checkout.session.completed` webhook.
- **DatoCMS** — editorial content (pages, posts) plus interim product content and taxonomy. Exactly one environment, `main`.
- **ForgeCMS** — a standalone instance at `cms.pghrugby.com`, consumed server-to-server over its Content Delivery API: site chrome and competition data (nav, footer, settings, sponsors, teams, matches, schedules, standings, links, socials).
- **Supabase** — the `orders` and `carts` tables, written service-role only.

The WordPress→CMS `migrations/` directory is preserved until the content migration is confirmed landed.

## Capabilities and Constraints

- Next.js App Router; Node pinned to 24 by `.nvmrc`.
- Buyable flows: dues, registrations, donations, golf outing, Steel City 7s, and sponsorship.
- Product detail pages compose products as Simple, Variation, or Grouped.
- DatoCMS has a single environment; never fork, promote, or destroy one without the owner's explicit approval.
- ForgeCMS is an external service — no vendored core and no `/admin` mount in this repo.
- Medusa, Strapi, and Sanity are removed; never reintroduce them or their patterns.
- TypeScript errors and lint are currently ignored during builds while a pre-existing backlog is resolved.

## Brand Commitments

- Name: **Pittsburgh Forge Rugby Club**.
- Existing club crest/logo and identity are binding.
- Existing typefaces: Lemon Milk, Oswald, and Noto Sans.
- Skyline SVG artwork is part of the established visual identity.

## Evidence on Hand

Real, usable proof that future work must preserve and may draw on:

- Match results, schedules, and standings (via ForgeCMS).
- Sponsor logos.
- Club crest/logo and club history/photography.
- Editorial blog content (DatoCMS).
- Real products and prices (Stripe).

Do not fabricate testimonials, statistics, pricing, sponsors, or history.

## Product Principles

1. Serve prospective players and alumni/fans first; let the surface decide which one leads.
2. Lead with the club's real identity — historic, Pittsburgh, two sides — never a generic rugby template.
3. Show real proof (results, standings, sponsors, products, posts); never invent it.
4. Treat commerce as part of the club experience, not a detached storefront.
5. Preserve product truth through the WordPress cutover rather than redesigning around it.
