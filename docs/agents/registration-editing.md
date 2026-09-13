# Registration editing: changing a collector entry already in the cart

Status: **decided 2026-09-12** for
[Grilling: Editing a registration already in the cart](https://github.com/Chapster87/pghrugby/issues/58)
on
[Wayfinder map: Multi-product PDP to minicart to checkout](https://github.com/Chapster87/pghrugby/issues/54).

This fixes how a buyer changes the answers — and the quantity — of a registration
that is already in the cart. It **amends** the cart-line model in
`docs/agents/cart-line-model.md`
([Grilling: Cart line model](https://github.com/Chapster87/pghrugby/issues/57)),
which deferred editing as remove-and-refill, and it **rescinds** that
remove-only rule for the registration case.

## 1. Editing is in the first slice

A registration in the cart is **editable in place**. Remove-and-refill is no
longer the only path: removing a primary cascades, so it also destroys the
line's linked add-ons and forces the buyer to retype a whole roster — the exact
cost this decision removes. This is a scope addition to the first slice, not a
fast-follow.

## 2. The edit surface changes the registration only

- The surface edits the linked `CollectorEntry`'s **answers** and the
  registration `PricedLine`'s **quantity** — and nothing else.
- Swapping the **primary sku** is a _different product_: registration-bearing
  lines never merge (§ 2 of the cart-line model), so a primary change stays
  remove-and-re-add. It is not offered inside the edit surface.
- **Add-ons** are independent flat priced lines with their own affordances
  (quantity, remove); they are not managed by the edit surface.

## 3. Same line, in place

- Editing **mutates the existing `CollectorEntry`'s `answers` in place**. The
  entry keeps its `id` and `parentId`; the primary `PricedLine` is untouched.
- The line's **linked add-ons survive**, cart order is stable, and nothing else
  in the cart moves or re-keys.
- One edit writes exactly two fields together: `CollectorEntry.answers` and the
  primary `PricedLine.quantity`. They are the registration's two halves and must
  not be allowed to diverge.

## 4. Quantity is editable, and `quantity → rows` holds

- The edit surface carries the registration's **quantity control** (golf: 1–4).
  Making the dialog the single place to fix a registration is the point of § 1;
  leaving quantity to remove-and-refill would reintroduce its cost.
- Increasing quantity **appends empty player rows**; decreasing **drops trailing
  rows**. Dropping a row that already holds a name **warns before discarding** —
  never silently — in the spirit of the cart-line model's warn-never-block rule.
- This preserves
  [Grilling: PDP product model](https://github.com/Chapster87/pghrugby/issues/69)'s
  direction **`quantity → rows`**: the collector's repeatable rows mirror the
  line quantity.
- A registration line in the flyout therefore shows **Edit + Remove only** — no
  stepper (the edit surface owns quantity), per the cart-line model § 5.

## 5. One Dialog, a second panel — not a nested Dialog

- The minicart flyout is a **Radix Dialog** (see
  [Prototype: Minicart flyout](https://github.com/Chapster87/pghrugby/issues/63)),
  chosen for its accessibility (focus trap, Esc, backdrop, `aria`).
- The edit surface is **not** a second Dialog stacked on top. The flyout Dialog
  holds a `view: cart | edit` panel: choosing Edit swaps the same
  `Dialog.Content` to the collector form, and Back/Cancel returns to the cart
  list. One Dialog, one focus scope, one dismiss contract for the whole journey;
  the standard sheet-slides-to-detail idiom, especially on mobile.
- The affordance belongs to the **registration-line component**, so it renders
  wherever a registration line renders. In the first slice that is the flyout;
  whether the standalone `/cart` page survives as a cart surface is
  [Grilling: Rollout of the new PDP to minicart to checkout flow](https://github.com/Chapster87/pghrugby/issues/61)'s
  call, and it inherits the affordance if it does.

## 6. Save / cancel semantics

- **Same rules as add-time:** the collector's required fields must be valid to
  Save; otherwise the surface shows per-field errors and does not commit.
- **Cancel discards everything**; nothing mutates until Save.
- An **empty player row stays allowed** — the "fewer named people than paid
  registrations" case is a warning, never a block (cart-line model § 4).

## 7. Field definitions snapshot onto the entry (amends the cart-line model)

- `CollectorEntry` carries a **snapshot of the collector's field definitions**
  (label, type, options, required, repeatable/max) taken at add-time, beside
  `answers`, so the edit surface renders exactly the form the buyer filled.
- This keeps the cart **client-only** — no CDA token in the browser, no extra
  fetch route — and matches "add to cart commits a fully specified line".
- **Amended entry shape:**

  ```
  CollectorEntry {
    id,
    kind: "collector",
    collectorRef,
    answers,
    fields,        // snapshot of the collector's field definitions at add-time
    sourcePdp,
    groupRef,
    parentId?
  }
  ```

- Consequence: a DataCollector edited in DatoCMS **after** an add does not
  retroactively reshape an existing line's edit surface — the buyer always edits
  the form they filled.

## 8. Deferred / follow-ups

- The drawer's panel transition and focus behaviour are designed with the flyout
  ([Prototype: Minicart flyout](https://github.com/Chapster87/pghrugby/issues/63));
  decided as a CSS cart ↔ edit slide inside one Dialog (`docs/agents/minicart-flyout-direction.md`).
- Whether `/cart` remains a cart surface
  ([Grilling: Rollout of the new PDP to minicart to checkout flow](https://github.com/Chapster87/pghrugby/issues/61)).
- The edited summary flows into Stripe metadata automatically — the per-line
  summary is recomputed at session build
  (`docs/agents/stripe-checkout-registration-metadata.md`), so editing needs no
  separate metadata path.
