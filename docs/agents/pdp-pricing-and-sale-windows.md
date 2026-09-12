# PDP pricing: DatoCMS price authority + scheduled sale windows

Status: **decided 2026-09-12** for
[Grilling: Scheduled sale / early-bird pricing](https://github.com/Chapster87/pghrugby/issues/72)
on
[Wayfinder map: Multi-product PDP to minicart to checkout](https://github.com/Chapster87/pghrugby/issues/54).

## Decisions

- **Price authority moves to DatoCMS.** The `product` model's `priceId` (today
  selected by the PDP query but unused — checkout resolves `priceId` from
  `catalog.ts` by sku) becomes the regular Stripe Price for that product.
- **Early bird is price-level.** A scheduled sale is a second Stripe Price,
  chosen by a window on the product — not a coupon — so it can combine with a
  coupon ([Grilling: Steel City 7s additional-side pricing](https://github.com/Chapster87/pghrugby/issues/71)).
- **Resolution:** `effectivePriceId = now ∈ [sale_starts_at, sale_ends_at] &&
  sale_price_id ? sale_price_id : price_id`. Resolved **server-side** at cart
  build and at Checkout Session creation (fresh, so a window closing while a cart
  sits open re-prices), and read on the PDP for display.
- **`catalog.ts` stays, reduced in role.** It remains the sku → `label` /
  `unitAmount` map and the test-mode `price_data` source; the **live `priceId`
  comes from DatoCMS**. (Option A — least disruption.)

## Schema additions (feed the migration)

On the `product` model, in `docs/agents/datocms-pdp-buckets-migration.md` § 1b:

| Field | Type | Notes |
| --- | --- | --- |
| `price_id` | string (exists) | The regular Stripe Price id — now authoritative |
| `sale_price_id` | string, optional | The sale / early-bird Stripe Price id |
| `sale_starts_at` | datetime, optional | Window start |
| `sale_ends_at` | datetime, optional | Window end |

A **single window** (not a repeatable schedule block); it can grow into a block
later if several windows are ever wanted. Window datetimes are absolute;
interpret them in the club's local timezone (`America/New_York`).

## Why not Stripe-native scheduling

Verified against the Stripe API: there is **no native price scheduler.** The
`Price` object's only lever is `active` (boolean; set via
`POST /v1/prices/:id`) — no `start_at` / `end_at`. Stripe's only scheduling
primitives are **Subscription Schedules** (recurring only, not one-time Checkout)
and **Test Clocks** (test mode only). A coupon or promotion code can auto-expire
(`redeem_by` / `expires_at`) but cannot auto-start, and it could not stack with
the additional-side coupon.

A Stripe-as-source-of-truth design (two Prices + an external cron flipping
`active`, with the app resolving the active price from Stripe) was considered and
rejected: it needs an external scheduler and makes pricing a runtime Stripe read.
DatoCMS windows keep the schedule where the owner already edits content.

## Consequences

- The PDP route gains a price read from DatoCMS for display; the cart/session
  path gains one for the live priceId.
- That read can be combined with the `in_stock` check decided in
  [Grilling: PDP product model](https://github.com/Chapster87/pghrugby/issues/69)
  (both resolve the cart's skus to DatoCMS `product` records at cart build +
  session creation).
- The "server-authoritative, code-owned catalog" pattern is amended: authority
  for *amount* stays server-side, but the *price selection* is now DatoCMS
  content.

## Related

- `docs/agents/sc7s-additional-side-pricing.md` — the additional-side coupon,
  which stacks on top of an early-bird price.
- [Grilling: PDP product model](https://github.com/Chapster87/pghrugby/issues/69)
  — the product fields (`product_type`, `in_stock`, `quantity_bearing`).
