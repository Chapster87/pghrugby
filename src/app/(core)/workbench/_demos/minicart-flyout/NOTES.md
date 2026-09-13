# Minicart flyout — prototype notes

**Question** ([wayfinder #63](https://github.com/Chapster87/pghrugby/issues/63)):
what does the minicart flyout look and behave like? Specifically the line
layout (including per-line registration responses), the quantity/remove
affordances, the subtotal + Checkout + empty state, and how it opens and closes.

**Status:** direction picked — **Grouped cards** — and signed off. The prototype
is retained as the reference for implementation, not deleted.

## Verdict

**Grouped cards.** Each add-to-cart action is one bordered card: the primary
line, its registration answers as a labelled definition list, and its add-ons as
an indented set. "Tight ledger" (flat dense rows) and "Editorial full-bleed"
(wide image banners, name chips) were prototyped and dropped.

Refinements applied to the winner:

1. **Quantity rail standardized** — every line's quantity control sits top-right
   of the line with the extended price directly beneath it; locked quantities
   (registrations, non-quantity-bearing products) show `Qty. N` in that slot.
   No centered, own-line steppers.
2. **Remove wears a trash icon and red text**, **Edit a pencil icon** with the
   label just "Edit". On the line they sit aligned; on an add-on, Remove sits
   directly beneath the add-on name.
3. **Drawer/sheet slide** on open/close (right on desktop, bottom on mobile).
   The cart ↔ edit swap always enters from the right, and the initial open has
   no separate content animation — it rides the sheet. All plain CSS on Radix's
   `data-state` / on mount; no animation library, reduced-motion honoured.
4. The quantity control is the **shared global `QuantitySelector`** (the PDP
   field look from `docs/agents/pdp-layout-direction.md` § 6). The flyout wraps
   it rather than passing it a class: its props spread would otherwise drop the
   component's own root class — a real bug found and fixed while aligning it.

Full decision: `docs/agents/minicart-flyout-direction.md`.

## How to run

```
pnpm dev
```

Then open http://localhost:8000/workbench/minicart-flyout. The flyout is open on
load; close it and re-open from the mock storefront's cart button, or press
**Add to cart** on the pig roast card to watch it auto-open and merge into an
existing line. The fixture toggle covers Mixed / Golf-only / Empty.

## Throwaway by intent

Synthetic fixtures only — no DatoCMS, Stripe, or cart API; Checkout is a stub.
The shell uses raw Radix Dialog inline for the drawer/sheet positioning;
implementation should add a global **Sheet/Drawer** wrapper (and, per the
retained card design, a global **cart-line card** component) rather than
promoting these files. Delete this folder once the flyout is built for real.
