# PDP to minicart to checkout: rollout plan

Status: **decided 2026-09-13** for
[Grilling: Rollout of the new PDP to minicart to checkout flow](https://github.com/Chapster87/pghrugby/issues/61)
on
[Wayfinder map: Multi-product PDP to minicart to checkout](https://github.com/Chapster87/pghrugby/issues/54).

Companion to the flow's other decisions — `docs/agents/pdp-layout-direction.md`,
`docs/agents/minicart-flyout-direction.md`, `docs/agents/cart-line-model.md`,
`docs/agents/registration-editing.md`,
`docs/agents/order-records-and-reporting.md`. This fixes **how the new flow
replaces the old one**.

## 1. Strategy: replace in place

One cutover, no runtime feature flag, no dual-path coexistence. The existing
one-shot flow is deleted in the same change that ships the new one.

There is no feature-flag infrastructure in the app — the only conditional-render
primitive today is DatoCMS `draftMode()` — and the two flows cannot meaningfully
coexist anyway: the reshaped `carts` snapshot (per
`order-records-and-reporting.md`) is not readable by the old builder, so a flag
would offer no real fallback. The site is not live and there is no historical
data to preserve, so the cutover carries no zero-downtime constraint.

## 2. What is deleted, what replaces it

| Old | New |
| --- | --- |
| `product/[slug]/checkout-form.tsx` (one-shot PDP form) | the PDP layout from `pdp-layout-direction.md` |
| `(core)/cart/page.tsx` dues + donation builder | the minicart flyout (the only cart surface) |
| header `Cart` link → `/cart` navigation | an in-place flyout trigger carrying the item count |
| `carts.flow` / `carts.registration` | `carts.entries` (per `order-records-and-reporting.md`) |

Golf and Steel City 7s pages are rebuilt as PDPs in the same cutover — with the
one-shot form gone there is no fallback for them.

## 3. `/cart` and the header

- The header's `Cart` control becomes a **button that opens the flyout in place**
  (no navigation), carrying the item count.
- `/cart` survives as a **thin alias route that opens the flyout on arrival** — a
  canonical URL for the return pages' "Back to cart" CTA and for any future
  external links. It holds no cart-building UI.
- Internal references (the checkout header, success / return-page CTAs, the
  sitemap) are repointed at the flyout trigger, or kept on the alias, as fits.

## 4. Draft / preview parity

Full parity at cutover, matching every other page: the new PDP query threads
`includeDrafts: draftMode().isEnabled` and `baseEditingUrl: true`, so editors can
preview unpublished PDPs and use Content Link visual editing on the new fields.
The cart and minicart are client state and have no draft-specific behaviour.

Caveat: a draft PDP can reference a Stripe price that is not live yet; draft
preview must not create a chargeable session against an unreleased price. Treat
that as an authoring / validation concern, not a cutover blocker.

## 5. Content gate

All four orphan event PDPs (pig roast, ballpark, survivor pool, bar crawl) are
authored through the new format **before** the cutover, per the map's carried
execution note.

## 6. Cutover sequence, gate, and rollback

1. Apply the Supabase reshape (`carts.entries`; the orders header plus
   `order_lines` / `order_registrations`; `orders.flow` → `families`).
2. Retire the `sc7s-*-additional-side` Stripe products in the same window (per
   `sc7s-additional-side-pricing.md`).
3. Deploy the new flow.

**Gate:** a manual end-to-end pass on a preview deploy — a real *mixed* cart
(golf registration + add-on + a dues line + a preset donation) through PDP →
flyout → edit → checkout → success, asserting the `orders` header, child rows,
and `families` land correctly. A thin automated smoke check may back this up but
does not replace the end-to-end pass.

**Rollback** = revert the deploy and the migrations. Safe because `carts` are
ephemeral snapshots and nothing is live.

## 7. Prototypes and `/workbench`

The two flow prototypes (`workbench/_demos/pdp-layout`,
`workbench/_demos/minicart-flyout`) are deleted once the real PDP and flyout
ship; they carry synthetic fixtures that would drift from the implementation
(`minicart-flyout-direction.md` § 9 already called for this).

`/workbench` stays and is meant to grow — it is the shelf for the global
component wrappers. **Temporary flow prototypes do not belong in `/workbench`;**
they get their own throwaway location outside it.

## 8. Back-compat

None required. The site is not live and no historical `orders` / `carts` data is
worth preserving, so the schema can be reshaped rather than dual-read.
