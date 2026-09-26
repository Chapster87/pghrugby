# Minicart flyout: chosen direction

Status: **decided 2026-09-13** for
[Prototype: Minicart flyout](https://github.com/Chapster87/pghrugby/issues/63)
on
[Wayfinder map: Multi-product PDP to minicart to checkout](https://github.com/Chapster87/pghrugby/issues/54).

Companion to `docs/agents/cart-line-model.md` (what the cart holds) and
`docs/agents/registration-editing.md` (how a registration is edited) — this
fixes **how the flyout looks and behaves**.

## 1. Direction

**Grouped cards** (variant B of the prototype). One bordered card per
add-to-cart action. "Tight ledger" (flat dense rows) and "Editorial full-bleed"
(wide image banners, name chips) were prototyped and dropped.

## 2. Shell

One Radix Dialog, `view: cart | edit` (per `registration-editing.md` § 5):

- **Desktop** — a right-hand drawer, full height, `min(420px, 100vw)`.
- **Mobile** — a bottom sheet, `max-height: 88vh`, rounded top corners.
- **Animations are plain CSS** on Radix's `data-state` and on mount: the
  drawer/sheet slides in from its edge on open and back out on close. The cart
  list and the edit panel swap inside the same Dialog by **always entering from
  the right**; the initial open carries no separate content animation — it rides
  the sheet's own slide. `prefers-reduced-motion` disables all of it. No
  animation library is needed (`motion/react` was considered and not taken).

## 3. The card

Cards group the top-level priced lines by `groupRef` (the add-to-cart action
that created them) — `groupRef` stays a display tag, never an identity key.

- **Card header** — the source PDP label and the group total.
- **Primary line** — thumbnail, name/note, quantity rail, price.
- **Registration answers** — the snapshotted fields rendered as a labelled
  definition list, read straight from the collector entry's `fields` +
  `answers`.
- **Add-ons** — an indented set under a dashed divider, each with its own
  quantity and remove.
- **Actions** — `Edit` (registration lines only) and `Remove`, below the line.

## 4. Line alignment

Standardized so every line reads the same way:

- The **quantity control sits top-right** of the line, with the **extended price
  directly beneath it** on a right-aligned rail. Lines whose quantity is locked
  in the flyout — registration lines (the edit panel owns quantity, per #58) and
  non-quantity-bearing products — show **`Qty. N`** in that slot instead of a
  stepper.
- **Edit** wears a pencil icon, **Remove** a trash icon with red text; the two
  are equal-height buttons aligned together. No "Registration" suffix. On an
  add-on, Remove is the same bordered button placed **directly beneath the
  add-on name**, with the qty/price rail to its right.
- The quantity control is the **shared global `QuantitySelector`** — the same
  control restyled for the PDP (`docs/agents/pdp-layout-direction.md` § 6).
  Consume it directly; do not pass it a `className`, which overrides its own
  root class through its props spread.

## 5. Edit panel

Unchanged from `registration-editing.md`: Edit swaps the same `Dialog.Content`
to the collector form (no nested Dialog, one focus scope, one dismiss contract),
focus lands on the first field and returns to the Edit control on Back/Cancel/
Save, quantity drives the player rows, and reducing quantity warns before
dropping a named row.

## 6. Opening and closing

- Opens **on add-to-cart** (the PDP's add action) and from the **header cart
  button**, which carries the item count.
- Closes on **Esc**, **backdrop click**, and the **Close** control, all Radix's
  focus-trapped Dialog behaviour.

## 7. Footer and empty state

- Footer: `Subtotal` and a full-width **Checkout** CTA.
- Empty: a dashed placeholder card and a "Keep browsing" action.

## 8. Global components to extract

Per the map Notes (wrap primitives once), implementation should land these as
global wrapper components rather than copying the prototype:

- a **Sheet/Drawer** wrapper around `@components/dialog` (the flyout's
  positioning + slide), and
- a **cart-line card** component (the grouped-card design), so the flyout, a
  future `/cart` page, and order summaries stay consistent.

`QuantitySelector` is already global.

## 9. Prototype

The reference prototype (`src/app/(core)/workbench/_demos/minicart-flyout/`) was
deleted at the cutover ([#88](https://github.com/Chapster87/pghrugby/issues/88)),
once the real flyout shipped.

Its synthetic cart fixtures are the mixed-cart scenario the Playwright suite
adopts ([#76](https://github.com/Chapster87/pghrugby/issues/76)): a golf
registration line with its collector answers, its add-ons, a pig roast ticket
line, a dues line, and a donation — several families in one cart.
