# Cart line model: entries, merging, quantity, mutations

Status: **decided 2026-09-12** for
[Grilling: Cart line model (add-ons, merging, quantities, edits)](https://github.com/Chapster87/pghrugby/issues/57)
on
[Wayfinder map: Multi-product PDP to minicart to checkout](https://github.com/Chapster87/pghrugby/issues/54).

This fixes the shape of the browser-held cart that the minicart flyout, the
checkout-session builder, and the order record all key off. It **replaces** the
single cart-level `registration` blob and `flow` slug in
`src/lib/checkout/cart-store.ts`, and it **amends** the quantity reading in
[Grilling: PDP product model](https://github.com/Chapster87/pghrugby/issues/69)
(`docs/agents/pdp-product-model.md`) — see § 6.

## 1. Two kinds of entry

```
CartEntry =
  | PricedLine      { id, kind: "product",   sku, quantity, sourcePdp, groupRef, parentId? }
  | CollectorEntry  { id, kind: "collector", collectorRef, answers, sourcePdp, groupRef, parentId? }
```

- `id` — stable client-generated id (uuid), assigned at add-time.
- `sourcePdp` — the PDP slug the entry was added from; replaces the cart-level
  `flow` slug. Reporting tag only, never drives building.
- `groupRef` — the add-to-cart action that created the entry. A UI/provenance
  tag for grouping entries added together; **not** an identity key.
- `parentId` — on an add-on `PricedLine` or on a `CollectorEntry`: the `id` of
  the primary `PricedLine` it was added with.
- `collectorRef` — the DatoCMS `data_collector` record id.
- `answers` — the DataCollector payload (captain, players, team, …), keyed by
  field name.

Only a `PricedLine` is commercial: one `sku`, a buyer-set `quantity`, and the
**only kind that becomes a Stripe line item**. A `CollectorEntry` is the "faux
line item" — it renders and behaves like a line in the flyout and the order but
carries no sku and no price.

Add-ons are ordinary priced lines; there is **no nesting**. A primary line, its
add-ons, and its collector entry form a group through `parentId`, not through
the data shape. The flyout may render that group visually.

## 2. Line identity and merging

Cart entries are appended in add order. When an add would land on an existing
line, the merge key decides:

| Entry                                                                                 | Merge key         | Behaviour                                                                          |
| ------------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------- |
| **Registration-bearing** priced line — one that a `CollectorEntry.parentId` points at | —                 | **Never merges.** Every add is a new line plus a new collector entry.              |
| **Add-on** priced line (`parentId` set)                                               | `(sku, parentId)` | Merges with an add-on line of the same sku under the same primary; quantities sum. |
| **Plain** priced line (no collector entry, no `parentId`)                             | `sku`             | Merges by sku; quantities sum.                                                     |
| **Collector entry**                                                                   | —                 | **Never merges.** One per add.                                                     |

- The same sku may appear on several lines at once. That is correct — two golf
  registrations are two lines; a mulligan under Jane's registration and a
  mulligan under John's are two lines.
- When two plain priced lines merge, any entry whose `parentId` points at the
  retired line is re-pointed at the survivor, so add-ons follow their primary.
- Two identical registration payloads do **not** collapse. Never merging keeps
  `parentId` stable (no re-parenting) and the case is theoretical.

## 3. Association and removal

- An add-on line and a collector entry each carry `parentId` → the primary
  priced line they were added with.
- **Removing a primary line cascades**: its add-on lines and its collector entry
  go with it. An add-on without its primary is not something the club can sell.
- Removing a single add-on removes only that line.
- A `CollectorEntry` cannot be removed or edited on its own — it has no meaning
  without its primary.
- A primary's **quantity stepper floors at 1**; leaving the cart is an explicit
  remove (which cascades).

## 4. Quantity

- Quantity is a **buyer-set property of the line**. It is never derived from the
  DataCollector.
- A product with `quantity_bearing: true` renders a stepper; the server clamps
  every line to 1–100 (`MAX_LINE_QUANTITY` in `cart-store.ts`).
- On a **registration-bearing line, quantity is the number of registrations**
  (for golf, the number of players), and the collector's repeatable rows
  **mirror** it: **`quantity → rows`**. The retired behaviour was the reverse
  (`rows → quantity`, "quantity = golfers").
- A mismatch between the answers and the quantity (fewer or more named people
  than paid registrations) is a **UI warning only** — it never blocks checkout
  (per #69; the club follows up directly at its scale).
- **Golf outing:** 1–4 per registration — one foursome. The **captain is player
  1** and the minimum collected. One foursome per registration; a second team
  would be a second registration (a second line + collector entry), which the
  first slice does not offer.

## 5. What the flyout can change

| Entry                                                   | Editable in the flyout                      | Fixed at add-time                                                                         |
| ------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Priced line, `quantity_bearing`, **no** collector entry | quantity (stepper), remove                  | —                                                                                         |
| Priced line, **with** a collector entry (golf, SC7s)    | **edit** (opens the collector form), remove | — (the edit surface owns quantity and answers; see `docs/agents/registration-editing.md`) |
| Add-on priced line                                      | quantity, remove (independent)              | —                                                                                         |
| Collector entry                                         | nothing on its own                          | answers; removed only by cascade                                                          |

Registration-backed lines offer **no stepper** in the flyout — because quantity
_is_ the row count on those lines, the edit surface (not the flyout) owns it. The
remove-and-refill rule is **superseded** for the registration case:
[Grilling: Editing a registration already in the cart](https://github.com/Chapster87/pghrugby/issues/58)
decided in-place editing (`docs/agents/registration-editing.md`), which mutates
the entry's answers and the primary's quantity together and adds a `fields`
snapshot to the entry shape in § 1.

## 6. Amendments to earlier decisions

- **`src/lib/checkout/cart-store.ts`**: `CheckoutCartItem` / `CheckoutSelection`
  become the entry shape above; the cart-level `registration` blob and `flow`
  slug are dropped (each entry carries `sourcePdp`). Stripe building walks the
  priced lines only, in cart order; a collector entry's summary attaches to its
  anchor line's `reg_N` metadata per
  [Research: Stripe metadata + product-image mechanics for registration responses](https://github.com/Chapster87/pghrugby/issues/55).
- **`docs/agents/pdp-product-model.md` § 2 / § 4**: `golf-outing-registration`
  is `quantity_bearing: true`, and the direction of the quantity/collector
  relationship is `quantity → rows`. The "Golf Outing … one registration
  primary" row and the "quantity = golfers is wrong" note need restating.
- **The workbench PDP fixture** (`/workbench/pdp-layout`) marks
  `golf-outing-registration` `quantityBearing: false`; that is wrong.
- **The golf DataCollector** (`Golf Outing — Captain & players`): the captain is
  player 1; the repeatable `golfers` field (`max: 8` today) becomes the
  **remaining 1–3 players** (`max` = quantity − 1).
- `docs/agents/stripe-catalog-spec.md` § 2.3 already matches this ("the buyer
  sets quantity explicitly … the form payload is independent of quantity").
  `docs/agents/stripe-checkout-registration-metadata.md`'s `"Golf Reg x4"`
  example must be read as **four players on one line**, not one line with a
  bolt-on quantity.
- **`PricedLine` gains an optional `quantityBearing`**, snapshotting the
  product's `quantity_bearing` at add-time (landed with
  [#81](https://github.com/Chapster87/pghrugby/issues/81); § 1's shape did not
  carry it). The browser cart holds no DatoCMS access, so without the snapshot
  the flyout cannot tell a line that gets a stepper from one that shows
  `Qty. N` (§ 5). It follows `docs/agents/registration-editing.md` § 7's `fields`
  snapshot: the buyer sees the line they added, not what the CMS says later.
  Display only — the server still clamps every quantity at session build.

## 7. Deferred

- **Grouped PDPs with add-ons.** No live product has one, so there is no single
  primary to attach an add-on to; leave unspecified until one exists.
- ~~**Editing answers / registration-backed quantity in the flyout**~~ — resolved
  by [Grilling: Editing a registration already in the cart](https://github.com/Chapster87/pghrugby/issues/58);
  detail in `docs/agents/registration-editing.md`.
- ~~**Order + reporting persistence** of collector entries as first-class rows
  linked to their line~~ — resolved by
  [Grilling: Orders + reporting shape for mixed carts](https://github.com/Chapster87/pghrugby/issues/60);
  detail in `docs/agents/order-records-and-reporting.md`.
- **Minicart visuals, grouping, and edge states** —
  [Prototype: Minicart flyout](https://github.com/Chapster87/pghrugby/issues/63)
  (decided: Grouped cards; detail in `docs/agents/minicart-flyout-direction.md`).
