# Registration responses and product imagery in an embedded Checkout Session

Research asset for **Ticket #55** on **Wayfinder map #54**. Every claim is cited to a docs.stripe.com primary source.

New rule this doc establishes: a compact per-line registration **summary** rides in Stripe metadata (`metadata` + `payment_intent_data.metadata`) so the club sees who registered in the Dashboard; the **full payload** stays in our `orders` table. The old "registration payloads do not belong in metadata" rule is amended at the end.

## Metadata surfaces per object

The per-object metadata limits are global: **50 keys, key ≤ 40 chars, value ≤ 500 chars, keys and values stored as strings, `[` and `]` forbidden in keys** ([Metadata API reference](https://docs.stripe.com/api/metadata), [Metadata guide](https://docs.stripe.com/metadata)). Each object below has its **own** 50-key budget.

| Surface | How it is set | Where it lands / is read | Notes |
| --- | --- | --- | --- |
| Session `metadata` | `metadata` on Create a Checkout Session ([create](https://docs.stripe.com/api/checkout/sessions/create)) | Checkout Session object `metadata` ([object](https://docs.stripe.com/api/checkout/sessions/object)); the Session object is the webhook payload, so it arrives on `checkout.session.completed` ([Metadata guide](https://docs.stripe.com/metadata)) | Session budget, independent of PaymentIntent budget |
| `payment_intent_data.metadata` | Nested create param on Create a Checkout Session ([create](https://docs.stripe.com/api/checkout/sessions/create)) | The resulting **PaymentIntent**'s `metadata`; "Data you include with the `payment_intent_data.metadata` attribute saves to the underlying PaymentIntent's metadata" ([Metadata guide](https://docs.stripe.com/metadata)) | Separate 50-key budget; a PaymentIntent copies its metadata to the Charge in a one-time snapshot ([Metadata guide](https://docs.stripe.com/metadata)) |
| **`line_items[].metadata`** | **Yes — `line_items.metadata` is a documented create parameter: "Set of key-value pairs that you can attach to an object."** ([create, `?query=line_items`](https://docs.stripe.com/api/checkout/sessions/create?query=line_items)) | **`line_items.data.metadata` (map, nullable) is a documented LineItem attribute** ([object, `?query=line_items`](https://docs.stripe.com/api/checkout/sessions/object?query=line_items)) | Each line item has its **own** 50-key budget. Not on the Session object by default — retrieve the session with `line_items` expanded to read it ([Fulfill orders](https://docs.stripe.com/checkout/fulfillment)) |
| `subscription_data.metadata` | Nested create param (subscription mode) ([create](https://docs.stripe.com/api/checkout/sessions/create)) | The resulting **Subscription**'s metadata ([Metadata guide](https://docs.stripe.com/metadata)) | Only relevant if memberships move into this flow |
| `payment_intent_data.description` | Nested create param ([create](https://docs.stripe.com/api/checkout/sessions/create?query=payment_intent_data)) | PaymentIntent `description` ([PaymentIntent object](https://docs.stripe.com/api/payment_intents/object)); `description` is a single string that "your users might see (for example, in email receipts)" ([Metadata API reference](https://docs.stripe.com/api/metadata)) | Single string, not the place for a per-line list |
| LineItem `description` | Derived; defaults to the product name ([object, `?query=line_items`](https://docs.stripe.com/api/checkout/sessions/object?query=line_items)) | LineItem read | Per-line human label, not metadata |
| `custom_fields` | `custom_fields[]` on Create a Checkout Session; ≤ 3 fields ([create, `?query=custom_fields`](https://docs.stripe.com/api/checkout/sessions/create?query=custom_fields)) | Session `custom_fields`; `checkout.session.completed` ([custom fields guide](https://docs.stripe.com/payments/checkout/custom-fields)) | **Customer-visible on the Checkout form** — collected from the buyer, not a place to preload a summary |
| `client_reference_id` | Create param, **max 200 chars** ([create](https://docs.stripe.com/api/checkout/sessions/create)) | Session object / webhook ([object](https://docs.stripe.com/api/checkout/sessions/object)) | Reconciliation key only |
| Product / Price `metadata` | Product and Price create params ([Product object](https://docs.stripe.com/api/products/object), [Price object](https://docs.stripe.com/api/prices/object)) | Catalog objects | Catalog-level, not per order |

The Checkout Session object has **no `description` field** (not in its attributes list: [Checkout Session object](https://docs.stripe.com/api/checkout/sessions/object)); use `payment_intent_data.description` or the Session/line-item `metadata` instead.

**Dashboard visibility.** Metadata "is viewable in the Dashboard (for example, when looking at the page for an individual payment), and is also available in common reports" ([Payment Intents API — Storing information in metadata](https://docs.stripe.com/payments/payment-intents/creating-payment-intents)). In `payment` mode the Dashboard payment detail page is the PaymentIntent, so the surface to rely on is **`payment_intent_data.metadata`**; Session-level `metadata` lives on the Checkout Session object. Metadata is also searchable in the Dashboard with the `metadata:` filter ([Search in the Dashboard](https://docs.stripe.com/dashboard/search)). Dashboard display of **line-item** metadata specifically is not stated on any page I could reach — treat it as unverified (see final report).

## Per-line registration summary

**Scheme — one key per line, positional.** Because we build the `line_items` array server-side, use the zero-based array position: `reg_0`, `reg_1`, … (keys ≤ 40 chars, no `[`/`]`). Write the **same keys twice**, since the two budgets are independent:

- session `metadata[reg_N]` — travels to our webhook with the Session object ([Metadata guide](https://docs.stripe.com/metadata));
- `payment_intent_data.metadata[reg_N]` — lands on the PaymentIntent, which is the page the Dashboard shows for an individual payment ([Payment Intents API](https://docs.stripe.com/payments/payment-intents/creating-payment-intents)).

For more than 50 lines, put the per-line string in that line's own `line_items[].metadata` (each line carries its own 50-key/500-char budget — [create](https://docs.stripe.com/api/checkout/sessions/create?query=line_items), [object](https://docs.stripe.com/api/checkout/sessions/object?query=line_items)) and keep only the first 50 in the session/PaymentIntent maps, plus a pointer key to the full payload.

**Worked example** (golf foursome: line 0 registration ×4, line 1 mulligan ×4, line 2 drink band ×2):

```
metadata[reg_0]     = "Golf Reg x4: Jane Smith, John Doe, Alex Lee, Sam Ray"
metadata[reg_1]     = "Mulligan x4: Jane Smith, John Doe, Alex Lee, Sam Ray"
metadata[reg_2]     = "Drink Band x2: Jane Smith, John Doe"
metadata[reg_count] = "3"
metadata[reg_ref]   = "<orders row id / cartRef>"   # full payload lives here
```

**Truncation rule.** Values are strings and may contain any characters — only *keys* forbid `[`/`]` ([Metadata API reference](https://docs.stripe.com/api/metadata)) — so a JSON value is legal, but plain single-line text reads best in the Dashboard. Cap each value at 500 chars; when a summary would exceed it, keep the header and as many entries as fit, end with a marker such as `… +3 more`, and rely on `reg_ref` to reach the untruncated payload in `orders`. Never let a value overflow silently. A per-line value is capped at 500 chars, so with `reg_0…reg_49` the session and PaymentIntent maps each carry at most ~25 KB of summary.

**Caveat.** `reg_N` indexes the order we sent in `line_items`, which is the created order ([Update a Checkout Session](https://docs.stripe.com/api/checkout/sessions/create#update_checkout_session-line_items)). If a line uses `adjustable_quantity`, the summary records the add-time selection, not the final quantity the buyer adjusts in Checkout ([create](https://docs.stripe.com/api/checkout/sessions/create?query=line_items)).

## Cart line thumbnails from Stripe product images

**Where images live: the Product, not the Price.** `Product.images` is an "array of strings" (URLs) that defaults to empty and is set with the `images` parameter, "a list of up to 8 URLs of images for this product, meant to be displayable to the customer" ([Product object](https://docs.stripe.com/api/products/object), [Create a product](https://docs.stripe.com/api/products/create); the Checkout-inline path states the 8-URL cap as `price_data.product_data.images` — [create](https://docs.stripe.com/api/checkout/sessions/create?query=line_items)). In the Dashboard, product images are uploaded onto the Product (JPEG/PNG/WEBP < 2 MB) and "the image appears at checkout" ([Manage products and prices](https://docs.stripe.com/products-prices/manage-prices)).

**Recommended — (a) expand the product on the session's line items (server-side).** On `checkout.sessions.retrieve(id, { expand: ['line_items.data.price.product'] })`, read `lineItem.price.product.images`. The path is built from documented links: `line_items` is expandable ([Checkout Session object](https://docs.stripe.com/api/checkout/sessions/object)), `Price.product` is expandable ([Price object](https://docs.stripe.com/api/prices/object)), and "Expansions on list requests start with the `data` property" plus a max depth of four levels ([Expanding responses](https://docs.stripe.com/api/expanding_objects)) — `line_items.data.price.product` is 3 levels. Caveats: line items are **not** in the `checkout.session.completed` event by default, so this retrieve is required anyway ([Fulfill orders](https://docs.stripe.com/checkout/fulfillment)); deep expansions "might result in slower processing times", so cache ([Expanding responses](https://docs.stripe.com/api/expanding_objects)).

**For the browser-held minicart before a session exists — (c) the same data one step earlier.** At add-time the server already knows the Price, so `prices.retrieve(priceId, { expand: ['product'] })` and read `price.product.images`, caching the resolved URL on the cart line ([Price object](https://docs.stripe.com/api/prices/object), [Expanding responses](https://docs.stripe.com/api/expanding_objects)). This is the Price→Product expand, the pre-checkout equivalent of (a); (a) covers any session-derived rendering (return page, webhook, order view).

**Rejected — (b) mirroring image URLs into our own catalog/DatoCMS.** It creates a second catalog that drifts from Stripe, and Stripe's own Product image already renders on Checkout ([Manage products and prices](https://docs.stripe.com/products-prices/manage-prices)). The project's catalog of record is Stripe ([stripe-catalog-spec.md](./stripe-catalog-spec.md) §2/§4), so the thumbnail should be read from `Product.images` rather than copied.

**Image caveats.** `images` is empty until set (the sample Product shows `"images": []` — [Product object](https://docs.stripe.com/api/products/object)); fall back to a placeholder. The array is the only documented ordering (no separate primary-image field), so treat `images[0]` as the thumbnail. Stability/longevity of Stripe-hosted file URLs for hotlinking or long-term caching is **not documented** on the pages reached — unverified; if a stable URL is required, download and re-host the image.

## Hard limits

- Metadata per object: **50 keys**, key **≤ 40 chars**, value **≤ 500 chars**, values stored as strings, **no `[`/`]` in keys** ([Metadata API reference](https://docs.stripe.com/api/metadata), [Metadata guide](https://docs.stripe.com/metadata)).
- Metadata is returned only for secret-key requests; it is redacted from publishable-key responses ([Metadata guide](https://docs.stripe.com/metadata)).
- Metadata is not visible to customers unless you choose to show it ([Metadata API reference](https://docs.stripe.com/api/metadata)).
- Session metadata, `payment_intent_data.metadata`, and each `line_items[].metadata` are **separate 50-key budgets** ([Metadata guide — Set metadata indirectly](https://docs.stripe.com/metadata), [create](https://docs.stripe.com/api/checkout/sessions/create?query=line_items)).
- `client_reference_id`: ≤ 200 chars ([create](https://docs.stripe.com/api/checkout/sessions/create)).
- `custom_fields`: ≤ 3 fields; `key` ≤ 200 chars alphanumeric; label ≤ 50 chars; text/numeric ≤ 255 chars/digits; dropdown ≤ 200 options; **customer-visible** ([create, `?query=custom_fields`](https://docs.stripe.com/api/checkout/sessions/create?query=custom_fields), [custom fields guide](https://docs.stripe.com/payments/checkout/custom-fields)).
- Line items: ≤ 100 in `payment` mode; ≤ 20 recurring + ≤ 20 one-time in `subscription` mode ([create](https://docs.stripe.com/api/checkout/sessions/create)).
- Product images: **up to 8** URLs ([Product object](https://docs.stripe.com/api/products/object), [create](https://docs.stripe.com/api/checkout/sessions/create?query=line_items)).
- Don't store sensitive data (bank/card/PII) in metadata or `description` ([Metadata API reference](https://docs.stripe.com/api/metadata)).

## Amendment to stripe-embedded-checkout-capabilities.md

That doc's §Consequences currently says:

> "**Registration payloads (golf, tournament) do not belong in metadata.** Collect them in a site-side form before checkout; the session carries the reference (`client_reference_id`), and the `orders` table links session id ↔ registration payload."

**Reversed.** The replacement rule: collect the full registration payload site-side as before, but ride a **compact per-line summary** in Stripe metadata — session `metadata` and `payment_intent_data.metadata` (and optionally each `line_items[].metadata`) — so the club can read who registered against the payment in the Dashboard; the **full payload remains in the `orders` table**, referenced by `reg_ref`/`client_reference_id`.
