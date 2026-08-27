# Stripe Checkout (embedded full page) — Capabilities Checklist

Research asset for wayfinder map issue **Wayfinder map: Single-repo Next.js site on Stripe + DatoCMS + ForgeCMS**, resolving **Research: Embedded Checkout capability check**. All facts verified against docs.stripe.com primary sources; each section cites the page it came from.

## Executive summary

Embedded Stripe Checkout (the "full page" Checkout product in its embedded mode, `ui_mode: embedded_page`) covers every current need of this project — multi-line-item purchases, donations, metadata, webhooks, and future shipping — with two hard constraints to design around:

1. **A pay-what-you-want (customer-entered amount) line item must be the *only* line item in the session** (quantity 1). So a custom-amount donation can never ride in the same Checkout Session as season dues. Grouped purchases (dues + donation) work only when the donation is a fixed price; a true pay-what-you-want donation needs its own checkout flow.
2. **The webhook is the source of truth for orders.** The `checkout.session.completed` payload is the Checkout Session object itself, but line items require a server-side retrieve with `expand: ['line_items']`, and the handler must be idempotent.

Everything else is accommodating: up to 100 line items, 50-key metadata, a 200-char `client_reference_id` for reconciliation, and `shipping_address_collection` that arrives on the session/webhook as `shipping_details`.

## Mode note: embedded vs hosted (same API)

"Full page" is the Checkout product; "embedded" vs "hosted" is where it renders. Both use the Checkout Sessions API and share identical capabilities. Differences are integration mechanics only:

| | Hosted (`ui_mode: hosted_page`) | Embedded (`ui_mode: embedded_page`) |
| --- | --- | --- |
| Navigation | Redirect to `checkout.stripe.com` (`session.url`) | In-page iframe, no redirect away from site |
| Success handling | `success_url` redirect | `return_url` redirect after payment |
| Client integration | Plain link/redirect | `client_secret` + `stripe.createEmbeddedCheckoutPage()` / React `EmbeddedCheckoutProvider` |
| Return page | Any URL | Must create one; reads `{CHECKOUT_SESSION_ID}` and retrieves session status |

Source: [Build a payments page](https://docs.stripe.com/payments/checkout) (feature/hosting comparison table); [Embed a checkout page in your site](https://docs.stripe.com/checkout/embedded/quickstart).

The "Embedded form" product (public preview, `payment-ui=checkout-form` variants) is *not* what this research covers — it is a separate, more limited UI (no cross-sells/upsells, limited order summary) and was not chosen in the map.

## Capabilities checklist

### 1. Embedded Checkout integration mechanics

- Checkout Session is created **server-side** (requires the secret key) with `ui_mode: 'embedded_page'`; the server returns the session's `client_secret`.
- Client mounts checkout with `stripe.createEmbeddedCheckoutPage({ fetchClientSecret })` → `.mount('#checkout')` (Stripe.js) or React `<EmbeddedCheckoutProvider options={{fetchClientSecret}}><EmbeddedCheckout/></EmbeddedCheckoutProvider>`.
- `return_url` is **required** for `embedded_page` (with `{CHECKOUT_SESSION_ID}` template variable); `success_url` is **not allowed**.
- `redirect_on_completion` defaults to `always` (redirect to `return_url` after successful confirmation); can be `if_required` or `never`.
- Return page retrieves the session and branches on `status`: `complete` → success; `open` → payment failed/canceled → remount Checkout.
- Do **not** nest Checkout inside another iframe — some payment methods require redirecting for confirmation.
- Local webhook testing: `stripe listen --forward-to <url>`; signing secret `whsec_...` from CLI output or Workbench's Event destinations tab.

Sources: [Embed a checkout page in your site](https://docs.stripe.com/checkout/embedded/quickstart); [Checkout Session object](https://docs.stripe.com/api/checkout/sessions/object) (`client_secret`, `redirect_on_completion`, `return_url`).

### 2. Multi-line-item grouped purchases (dues + donation)

- Up to **100 line items** per Checkout Session in `payment` mode; Stripe recommends consolidating once past a few dozen.
- Line items accept a `price` ID (predefined Price) or inline `price_data` (one-off, API-created price; not reusable/updatable).
- **Constraint that shapes the cart:** a Price with customer-chosen amount (`custom_unit_amount`) can be the **only** line item, quantity 1 (see §3). Mixed fixed-price items are fine: dues (fixed price) + fixed-amount donation (fixed price) is a normal two-line-item session.

Sources: [Create a Checkout Session](https://docs.stripe.com/api/checkout/sessions/create) (`line_items`); [Let customers decide what to pay](https://docs.stripe.com/payments/checkout/pay-what-you-want) (embedded-page variant).

### 3. Pay-what-you-want donations (custom amounts)

- Create a Price with `custom_unit_amount[enabled]=true`; optional bounds in the smallest currency unit:
  - `preset` — starting amount shown to the customer (editable),
  - `minimum` — must be at least Stripe's minimum charge amount for the currency,
  - `maximum`.
- Pass that Price's ID in the session's `line_items[].price` (quantity 1).
- Hard limitations when a session uses a customer-chosen price:
  - No other line items (quantity must be 1),
  - No promotion codes or discounts,
  - No recurring payments, no optional items.
- `submit_type: 'donate'` renders a "Donate" submit button (embedded quickstart uses it with `customer_creation: 'always'`).
- Alternative for donations: inline `price_data` with a server-set `unit_amount` (fixed amount per session) — API-only, not reusable, and does *not* let the customer choose the amount.

Sources: [Let customers decide what to pay](https://docs.stripe.com/payments/checkout/pay-what-you-want) (embedded-page variant); [Create a price](https://docs.stripe.com/api/prices/create) (`custom_unit_amount`); [Price object](https://docs.stripe.com/api/prices/object) (`custom_unit_amount.maximum/minimum/preset`); [Checkout Session object](https://docs.stripe.com/api/checkout/sessions/object) (`submit_type`).

### 4. Metadata limits

- **Up to 50 keys** per object; key names ≤ **40 chars**; values ≤ **500 chars**; stored as strings; **`[` and `]` are forbidden in keys**. Never store sensitive data.
- Session-level `metadata` is present on the Checkout Session object and therefore in the webhook payload.
- `payment_intent_data.metadata` is a separate create-parameter that copies key-value pairs onto the resulting PaymentIntent (separate budget from session metadata).
- Metadata is invisible to customers unless you display it; it does not affect authorization.

Sources: [Metadata](https://docs.stripe.com/api/metadata); [Create a Checkout Session](https://docs.stripe.com/api/checkout/sessions/create) (`metadata`, `payment_intent_data.metadata`).

### 5. `client_reference_id`

- Free-form string, **max 200 chars**, on session creation. Intended for reconciling the session with internal systems — "a customer ID, a cart ID, or similar."
- Surfaces on the Checkout Session object and therefore in the `checkout.session.completed` webhook payload.

Source: [Create a Checkout Session](https://docs.stripe.com/api/checkout/sessions/create) (`client_reference_id`); [Checkout Session object](https://docs.stripe.com/api/checkout/sessions/object).

### 6. `checkout.session.completed` webhook payload shape

- Event `checkout.session.completed`: `data.object` is a **Checkout Session**; fires "when a Checkout Session has been successfully completed."
- Fields reliably present on that object (the order-recording subset): `id`, `object`, `amount_subtotal`, `amount_total` (integers in the smallest currency unit), `currency`, `client_reference_id`, `created`, `customer` (Customer id, expandable), `customer_details` (email, name, address — address absent in `setup` mode), `customer_email`, `metadata`, `mode`, `payment_intent` (expandable), `payment_status`, `status`, `submit_type`, `total_details` (`amount_discount`, `amount_shipping`, `amount_tax`), `line_items` (expandable list), `shipping_details`.
- **Line items are not in the event by default** — retrieve the session server-side with `expand: ['line_items', 'payment_intent']`; use the line-items list API with auto-pagination if there are many.
- Fulfillment gate is **`payment_status`** (`paid` / `unpaid` / `no_payment_required`), not `status` — a session can be `complete` while payment processing is still in progress.
- **Async payment methods** (ACH, bank transfers, etc.): `checkout.session.completed` fires at session completion but funds land later; listen for `checkout.session.async_payment_succeeded` (and handle `checkout.session.async_payment_failed`). Session `payment_status` stays `unpaid`/processing until resolution.
- **Idempotency required**: the handler may be called multiple times, possibly concurrently, for the same session.
- Stripe **retries webhook delivery** on failure; also trigger fulfillment from the return page as a fast path, but webhooks are mandatory (the customer isn't guaranteed to reach the return page).

Sources: [Types of events](https://docs.stripe.com/api/events/types) (`checkout.session.completed`, `checkout.session.async_payment_succeeded/failed`); [Checkout Session object](https://docs.stripe.com/api/checkout/sessions/object) (all field docs); [Fulfill orders](https://docs.stripe.com/checkout/fulfillment) (embedded-page variant).

### 7. Future `shipping_address_collection`

- Enabling it requires `shipping_address_collection.allowed_countries`: an array of two-letter ISO country codes Checkout offers as shipping destinations (the full country list is enumerated in the API reference).
- Works with `ui_mode: embedded_page` (embedded quickstart and address-collection guide both demonstrate it).
- The collected address lands on the session's `shipping_details` and **is included in the `checkout.session.completed` webhook payload**.
- Independent of `billing_address_collection` (`auto` default / `required`).
- Shipping options/rates (`shipping_options`, `shipping_cost`) are separate — needed if shipping is ever charged, not required just to collect an address.

Sources: [Create a Checkout Session](https://docs.stripe.com/api/checkout/sessions/create) (`shipping_address_collection.allowed_countries`); [Collect physical addresses](https://docs.stripe.com/payments/collect-addresses) (embedded-page variant); [Checkout Session object](https://docs.stripe.com/api/checkout/sessions/object) (`shipping_details`, `shipping_cost`).

## Consequences for cart/session design

Grounded strictly in the facts above; anything account-specific is flagged in §Open questions.

- **One Checkout Session = one PaymentIntent = one `orders` row.** Grouped purchases become a single session with multiple line items; the webhook upserts an order keyed by session id. Session → order mapping needs no more than the session id plus the fields in §6.
- **Dues + donation, two flavors:**
  - *Fixed-amount donation* (preset donation prices) — can be a second line item in the dues session. Simplest; the whole cart pays in one transaction.
  - *True pay-what-you-want donation* — cannot share the session; it must be its own checkout flow with a sole `custom_unit_amount` line item. The donation UX decision (separate flow vs fixed presets) is now specifiable — see the graduated ticket.
- **The cart is server-authoritative.** The Next.js server holds price IDs and builds the Checkout Session; the client only requests a session for the current cart and mounts it. Never let the client dictate amounts/prices.
- **Reconciliation key = `client_reference_id`** (≤200 chars). Put the cart/order reference there; it is the top-level field designed for exactly this. Keep session `metadata` for small structured payloads (e.g. source page, registration form id) and stay well within the 50-key/40-char/500-char limits.
- **Registration payloads (golf, tournament) do not belong in metadata.** Collect them in a site-side form before checkout; the session carries the reference (`client_reference_id`), and the `orders` table links session id ↔ registration payload. Checkout also supports up to 3 `custom_fields` if small at-checkout data is ever wanted (note: `custom_fields` are customer-visible).
- **Webhook handler contract:** idempotent upsert by session id; retrieve with `expand: ['line_items']`; fulfill only when `payment_status != 'unpaid'`; handle `checkout.session.async_payment_succeeded` if non-instant payment methods get enabled later. Return page calls the same path as a fast-path, but the webhook is authoritative.
- **Donation flows use `submit_type: 'donate'`** for the correct button label, and `customer_creation: 'always'` keeps a Customer per donor (per the embedded quickstart).
- **Shipping later costs nothing now.** When it lands, pass `shipping_address_collection.allowed_countries` (e.g. `['US']`) and the address arrives in `shipping_details` on the webhook. Design the `orders` table with a nullable shipping column/JSONB so it doesn't need a migration later.
- **Return page is part of the build:** `return_url` with `{CHECKOUT_SESSION_ID}`, retrieve session, `complete` → success view, `open` → remount. Choose `redirect_on_completion` default (`always`) unless a persistent embedded success state is preferred.

## Open questions / caveats

- **Account payment methods:** whether the live Stripe account runs dynamic payment methods and whether ACH/bank transfer (async) methods will be enabled — determines whether `checkout.session.async_payment_succeeded` handling is required at launch. Verify in the Stripe Dashboard.
- **Minimum donation amount:** Stripe's minimum charge amount varies by currency; verify the current minimum when setting `custom_unit_amount.minimum`.
- **Donations and tax status:** Stripe has specific support requirements for tips/donations (cited in the pay-what-you-want guide) — worth a skim before going live with a donation flow.
- **Session expiry:** sessions carry `expires_at` and fire `checkout.session.expired`; decide a sensible expiry for abandoned carts (`expires_at` is configurable on create).
- **Refunds/disputes events** (`charge.refunded`, `refund.created`, disputes) are intentionally out of scope here — already tracked as fog on the map for the webhook ticket.
