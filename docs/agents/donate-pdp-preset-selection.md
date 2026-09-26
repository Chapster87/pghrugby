# Donate PDP: club presets as one product record each

Status: **decided 2026-09-13** for
[Grilling: Donate PDP preset selection under the single-price product model](https://github.com/Chapster87/pghrugby/issues/75)
on
[Wayfinder map: Multi-product PDP to minicart to checkout](https://github.com/Chapster87/pghrugby/issues/54).

Resolves the open follow-up in `docs/agents/donations-in-mixed-carts.md` § 4 and
its "Open follow-up" section. The Stripe catalog is **unchanged** — this decision
splits DatoCMS records, it does not touch Stripe products or prices.

## The problem

The Stripe `donation-club` product holds three fixed preset prices
(`donation-club-preset-10` / `-25` / `-50`; $10 / $25 / $50) and, per
`docs/agents/stripe-catalog-spec.md` § 2.5, may also hold a `custom_unit_amount`
price. The PDP product model (`docs/agents/pdp-product-model.md`) gives each
`product` record exactly **one** `price_id`, and a `variation` selector renders
**one option per primary** with one price card — so a record carrying several
preset prices has no representation.

The model's grain is a _sellable unit keyed to one Stripe Price_: the cart keys
off `sku`, and `src/lib/checkout/catalog.ts` already holds the three preset SKUs
(`donation-club-preset-10` / `-25` / `-50`), each with its own `priceId` and the
Stripe `lookup_key` of the matching price.

## Decisions

### 1. Split the presets into one `product` record each

Three DatoCMS `product` records keyed to the existing preset Prices:

| record `sku`              | `price_id`             | record title        |
| ------------------------- | ---------------------- | ------------------- |
| `donation-club-preset-10` | the `$10` preset Price | Club donation — $10 |
| `donation-club-preset-25` | the `$25` preset Price | Club donation — $25 |
| `donation-club-preset-50` | the `$50` preset Price | Club donation — $50 |

The record `sku` equals the existing `catalog.ts` SKU and the Stripe price
`lookup_key`, so the sku → price/catalog seam is an exact match. Each record is
`quantity_bearing: false`, `in_stock: true`, with no sale window.

The Stripe product `donation-club` **stays exactly as it is** — it is the club's
general name-your-price donation catch-all and is used elsewhere; we only key
records to its prices. All three preset lines therefore keep `family=donation`
(Stripe product metadata) and share the same Stripe product image.

### 2. Donate stays a `variation` page; the presets are its primaries

`product_detail_page.product_type` stays `variation`; its `primary_products`, in
order, are:

1. `donation-club-preset-10`
2. `donation-club-preset-25`
3. `donation-club-preset-50`

The selector renders the club ladder ascending; labels are
`Club donation — $10` / `— $25` / `— $50`. Selection stays subject to the
`variation` rule — one of N, no preselection (`docs/agents/pdp-product-model.md`
§ 5). Choosing a preset adds it as an ordinary cart line: a plain priced line,
`quantity_bearing: false`, merging by sku like any plain line — but never
accumulating, since a donation is always quantity 1
(`docs/agents/donations-in-mixed-carts.md` § 1).

> **Amended 2026-09-25** (owner). `donation-pass-the-hat` — the **$1** fourth
> primary this decision proposed — was a placeholder and is retired; the ladder is
> the three club presets only (`docs/agents/donations-in-mixed-carts.md` § 2).

### 3. The `donation-club` record becomes the any-amount record

The existing `donation-club` `product` record is **repurposed** as the
any-amount offering: its `price_id` becomes the `custom_unit_amount` Price
(preset **$50** / min **$1** / max **$10,000**), and it is the record the
standalone any-amount page field references — never a cart primary, per
`docs/agents/donations-in-mixed-carts.md` § 3. Its `sku` becomes
`donation-club-any` (matching the slot named in `stripe-catalog-spec.md` § 2.5)
and its title reads as the club's give-any-amount option.

This **drops** the separate `donation-club-pwyw` record proposed in
`donations-in-mixed-carts.md` § 4 — **amending** that decision's record name, not
its behaviour. The one DatoCMS record that keeps the `donation-club` name is the
catch-all any-amount offering, mirroring the one Stripe product that keeps it.

### 4. The catalog prefix fallback retires

`findCatalogItemsForProduct`'s "every catalog item whose sku starts with
`<sku>-`" fallback existed only for the one-record-many-prices `donation-club`
case. With every record now resolving to exactly one catalog item, the fallback is
removed; a record resolves to its exact catalog item or to nothing.

## Consequences — build work handed off

- **DatoCMS:** create the three preset records, update the `donation-club` record
  (`sku`, title, `price_id`) and the Donate PDP's `primary_products` — a
  migration + data update, fork-and-run → human-confirmed promote, as with the
  bucket migration (`docs/agents/datocms-pdp-buckets-migration.md` § 4).
- **Stripe:** mint the `custom_unit_amount` Price on the `donation-club` product
  per `donations-in-mixed-carts.md` § 3 and put its id on the `donation-club`
  record's `price_id`. No other Stripe change.
- **PDP:** the dedicated standalone any-amount page field (already required by
  #59) points at the `donation-club` record.
- **`catalog.ts`:** the three `donationPresets` entries stay as the sku → label /
  amount map; the live `priceId` comes from DatoCMS
  (`docs/agents/pdp-pricing-and-sale-windows.md`).

> **Built 2026-09-25** for
> [#87](https://github.com/Chapster87/pghrugby/issues/87). The migration
> `migrations/1790384662_donatePresetsAndAnyAmount.ts` creates the three preset
> records, adds the `any_amount_product` field, and repurposes the
> `donation-club` record as `donation-club-any`; the follow-up
> `migrations/1790385…_retirePassTheHatPlaceholder.ts` drops the retired
> placeholder. The Donate page's `primary_products` is the three club presets. The
> `custom_unit_amount` Price is minted by `provision-stripe-catalog.mjs` from its
> approval-checklist row (`donation-club-any`); its id is handed to the migration
> as `DONATION_ANY_AMOUNT_PRICE_ID`. The prefix fallback (§ 4) is removed.

## Forward direction (not part of this decision)

The owner expects a future revision in which the in-page any-amount affordance is
replaced by a **link below the dropdown** to a separate any-amount page. That
would revisit the "standalone CTA on the Donate PDP" surfacing in
`docs/agents/donations-in-mixed-carts.md` § 3. It is not implemented by this
decision, and nothing here forecloses it.
