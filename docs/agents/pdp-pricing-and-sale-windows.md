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

| Field            | Type               | Notes                                           |
| ---------------- | ------------------ | ----------------------------------------------- |
| `price_id`       | string (exists)    | The regular Stripe Price id — now authoritative |
| `sale_price_id`  | string, optional   | The sale / early-bird Stripe Price id           |
| `sale_starts_at` | datetime, optional | Window start                                    |
| `sale_ends_at`   | datetime, optional | Window end                                      |

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
  for _amount_ stays server-side, but the _price selection_ is now DatoCMS
  content.

## Amendment — the field is an override, not the sole authority (2026-09-23)

Decided while implementing
[Checkout and order records for a simple cart](https://github.com/Chapster87/pghrugby/issues/82),
which ran into the consequence of reading "authoritative" literally: on
2026-09-23 every `product.price_id` was still blank, so a live-mode build refused
**every** line, and checkout could not be taken live without first authoring 21
records.

The resolution keeps `effectivePriceId` as the **CMS's** rule and puts the
catalog's provisioned Price underneath it:

```
billablePriceId = effectivePriceId(record) ?? catalogItem.priceId
```

- The CMS field is labelled **"Price ID (override)"**, and that is the rule it
  now keeps: content overrides the default, and a blank field charges the price we
  provisioned rather than refusing the sale. The failure mode of an unauthored
  field is "the price we already set", never "no one can buy".
- Everything above still holds: the window still selects the sale Price,
  resolution is still fresh at cart build and at session build, and setting the
  field still reprices without a deploy.
- What changes is spec § 4.3's phrase, "the **authoritative** regular Stripe Price
  id": it is authoritative _over_ the catalog default, not the only source.
  `catalog.ts` keeps its live `priceId`s as that default instead of losing them to
  the CMS.
- Refusing to sell survives only for a sku with no price in either source — a
  provisioning hole, not a content decision.

**And each window bound is optional.** An empty bound does not limit the sale: a
set start means "from then on", a set end means "until then", and a sale Price
with no window at all is on sale. The formula above, read literally, required
both — and a linked sale Price then silently did nothing, which is precisely what
happened the first time a sale was set up. The bound that is _present but
unreadable_ is now the only one that refuses to discount. Ending a sale is an
explicit act: set an end date, or clear the field. Clearing matters — deactivating
the Price in Stripe while the field still names it fails session creation rather
than falling back.

**And the effective price is now displayed, not only billed.** `catalog.ts` holds
the regular amount and DatoCMS holds the sale Price's _id_, so the sale amount can
only come from Stripe: `src/lib/checkout/price-display.ts` resolves
`{ unitAmount, compareAtAmount }` per sku, and both buyer-facing surfaces render
the regular amount struck through ahead of the sale amount — the PDP from a
server-side resolve, the cart flyout over `POST /api/checkout/pricing`, the way it
already resolves thumbnails.

That read goes to the **live** account (`liveStripe`) whatever `STRIPE_ENV` says.
The amounts the site advertises have always been live — `catalog.ts` carries live
amounts and the PDP has always shown them — so display must not flip when billing
is a rehearsal against test; otherwise a sale the owner has just authored is
invisible on the very page they check it on.

Two consequences worth stating:

- In test mode the surfaces now show the live sale amount while a test-mode
  Checkout still bills the catalog's _regular_ inline `price_data`. Display and
  local billing therefore disagree by design, and live mode agrees throughout.
  Having the test-mode build bill the displayed amount instead is a possible
  follow-up — it would make a local rehearsal match production pricing exactly.
- A sale Price that cannot be read — no live key, an unknown or deactivated Price,
  a "sale" that is not actually cheaper — leaves the line on its regular amount,
  which is exactly what it showed before sales existed. Display can mislead at
  worst; it can never mis-charge, because billing resolves the Price **id**, never
  this amount.

Detail: `docs/agents/checkout-session-build.md` § 4.

## Related

- `docs/agents/sc7s-additional-side-pricing.md` — the additional-side coupon,
  which stacks on top of an early-bird price.
- [Grilling: PDP product model](https://github.com/Chapster87/pghrugby/issues/69)
  — the product fields (`product_type`, `in_stock`, `quantity_bearing`).
