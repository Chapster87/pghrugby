# Build webhook order rows from the event payload

The webhook records an order by re-fetching the Checkout Session from the Stripe
API: `recordOrder(session.id)` calls
`stripe.checkout.sessions.retrieve(id, { expand: [...] })`. The idea put forward
in #141 was to fold that write to the `checkout.session.completed` event's
`data.object` instead, dropping both the Stripe round trip and the one seam the
webhook integration test needs.

## Why this is out of scope

The event carries the Checkout Session **object**, but not the part the write
path actually needs. `line_items` is an **Includable** attribute of the Checkout
Session — returned only when a retrieve asks for it — so a
`checkout.session.completed` payload has no line items:

```
// A create/retrieve response without line items included:
{ "id": "cs_…", "amount_total": 2198, "payment_status": "unpaid", … }
//          ^ no `line_items`, no per-line price/product
```

`buildOrderRows` derives most of the durable record from those line items:

- **`order_lines`** — one row per line item, with `description`, `quantity`,
  `unit_amount`, `amount_total`, and `sku` all read off the line item and its
  expanded `price.product`.
- **`orders.families`** — the distinct `price.product.metadata.family` values,
  also read off the line items.

Only the header's identity, amounts, customer, and metadata come from the
session scalars. So an event-only path could not produce the rows without
*changing where the line data comes from* — moving the price authority off
Stripe's line items and onto data the app writes at session build (the `carts`
snapshot, or `session` / `line_items` metadata). That contradicts the recorded
contract that amounts and descriptions come from the session, i.e. that Stripe
is the price authority:

```ts
// src/lib/checkout/order-rows.ts
// "Amounts and descriptions come from the session (Stripe is the price
//  authority); the entry list supplies only provenance and registrations."
```

Stripe's own fulfillment guidance retrieves the session with `line_items`
expanded for exactly this reason, rather than reading the event's object — the
round trip is the documented path, not an oversight. See *Fulfill orders*
(https://docs.stripe.com/checkout/fulfillment) and the Checkout Session object
reference, where `line_items` is marked `Includable`
(https://docs.stripe.com/api/checkout/sessions/object).

The knock-on is that the integration test's seam is not removable either. The
test spies on that single `stripe.checkout.sessions.retrieve` because a signed
payload genuinely cannot drive the write — it lacks line items. The seam is a
faithful model of the API's shape, not a testing shortcut.

## Aside: the `payment_intent` expansion

The same retrieve also expands `payment_intent`, but the write path only ever
reads its id — which the event carries as a plain string. Dropping the expansion
is legitimate, but it saves nothing on its own: the retrieve is still required
for `line_items`, so it is not worth a change of its own.

## Prior requests

- #141: "Webhook: build the order rows from the event payload instead of
  re-fetching the session" (`wontfix`)
