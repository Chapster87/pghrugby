# E2E buy path

Status: **live** · phase 1 of the E2E layer for the testing-foundation map
([#126](https://github.com/Chapster87/pghrugby/issues/126)) — ticket
[#76](https://github.com/Chapster87/pghrugby/issues/76).

Companion to `docs/agents/production-smoke.md` (the read-only smoke against a
deployed site). This is the opposite end: a **writable** suite that drives the
real buy flow in a browser against the app running **locally**.

## What it covers

One canonical happy path, end to end:

1. `/golf-outing` — fill the golf DataCollector (`captainName`, `captainEmail`,
   the repeatable `golfers`) and tick the **Mulligan** add-on.
2. **Add to cart** → the **minicart flyout** shows the group (registration +
   add-on).
3. **Checkout** → `/checkout?cartRef=…`, which builds a real Checkout Session.
4. The **real Stripe test-mode embedded Checkout** — select the **Card** method,
   enter `4242 4242 4242 4242`, `12/34`, `123`, postal `15213`.
5. The **success page** (`/checkout/success?session_id=…`), where `recordOrder`
   writes the order server-side.
6. Read the rows back from the **local ephemeral Supabase** over PostgREST and
   assert them.

Phase 2 (a mixed cart and the three PDP shapes) is deliberately out of scope
here.

## Where it runs

- **Supabase**: the throwaway Postgres + PostgREST stack built for #129
  (`scripts/db/stack.mjs`), served under the `/rest/v1` mount the app's
  transport expects. Not `supabase start`; no Docker.
- **Stripe**: the **test** account. Test mode bills inline `price_data` at the
  displayed amount (a test key cannot reference a live Price), and the inline
  product carries the family metadata, so `orders.families` /
  `order_lines.family` land exactly as production would.
- **Serving**: `next build && next start` (prod-faithful), driven by
  Playwright's `webServer`.

### The safety guard (most important constraint)

The suite writes real order rows, so it **must be incapable of touching the
production Supabase project**. Before anything starts, `e2e/global-setup.ts`
sets `NEXT_PUBLIC_SUPABASE_URL` to the stack's loopback URL and loads the same
guard the integration layer uses (`scripts/db/assert-local.mjs`), which throws
unless the URL is loopback. The webServer env is built in one place
(`e2e/stack-env.ts`) from `stack.mjs`'s own constants, read from a plain `node`
subprocess so nothing is duplicated; global setup additionally asserts the live
stack agrees with them.

### Env overrides are load-bearing

Next's `@next/env` never overwrites a variable already present in
`process.env`, so `webServer.env` wins over `.env.local` — which holds
**production** Supabase creds and `STRIPE_ENV=live`. The run forces, for **both**
build and start (`NEXT_PUBLIC_*` is inlined at build):

- `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` → the local stack
- `STRIPE_ENV=test` / `NEXT_PUBLIC_STRIPE_ENV=test`
- `NEXT_PUBLIC_BASE_URL=http://127.0.0.1:8000` — **identical to the browser
  origin**. The cart is `localStorage`, so a differing origin (`localhost` vs
  `127.0.0.1`) would leave the post-Checkout redirect on a cartless origin.
- a non-secret `RESEND_API_KEY` placeholder.

Stripe **secret and publishable test keys** are left to `.env.local` locally
(`sk_test_…` / `pk_test_…`); CI supplies `STRIPE_SECRET_KEY_TEST` and
`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_TEST` as secrets.

### Stability, not a single lucky render

Stripe renders a slightly different form from run to run, so the spec never
assumes the exact set it saw once:

- **Every fill is verified and retried.** `fillVerified` re-reads the field after
  filling and keeps trying until the value actually sticks (a fill can race the
  field mounting or a Link-driven re-render). Numeric fields are compared on
  their digits, since Stripe reformats (`4242 4242 4242 4242`, `12 / 34`).
- **Link's "Save my information" is turned off, robustly.** The toggle mounts
  late, and while it is on Stripe renders a **required** phone field. The spec
  polls for the toggle and unchecks it until confirmed off, and re-checks it
  before submitting in case a re-render flipped it back.
- **The phone field is filled if it appears anyway** (country code defaults to
  US) — belt and braces for the case where the toggle couldn't be turned off.
- **Cardholder name and ZIP are filled when shown.**
- **Payment is submitted resiliently.** A single Pay click can be dropped while
  Stripe settles its validation state, so `submitPayment` re-clicks — but only
  while the button is **enabled**, which it is not while a payment is in flight,
  so this can never double-submit.

### Headed, not headless

Stripe's bot mitigation serves an **hCaptcha** to a headless browser and blocks
the embedded Checkout from completing; a headed browser passes it invisibly.
The Chromium project therefore runs `headless: false` (with
`--disable-blink-features=AutomationControlled` and `navigator.webdriver`
removed — fingerprint hygiene, nothing about Checkout itself is stubbed).

On Linux CI that needs a display: the `e2e` job runs the suite under
`xvfb-run -a`.

## Running it

```sh
nvm use                 # Node 24 (the .nvmrc pin)
pnpm test:e2e           # = playwright test --config playwright.e2e.config.ts
```

Prerequisites: PostgreSQL on `PATH` (the stack resolves the binaries itself) and
the Chromium browser installed (`pnpm exec playwright install chromium`). The
suite starts and stops the local stack itself via Playwright global
setup/teardown; `reuseExistingServer` keeps a running `next start` for local
iterations when not on CI.

## Selectors worth knowing

- Golf collector inputs are addressed by id: `#pdp-golf-outing-captainName`,
  `#pdp-golf-outing-captainEmail`, and the repeatable row by its aria-label
  `Golfer name 1`. Confirmed against the prerendered page — the authored
  collector is `captainName` + `captainEmail` + `golfers`, with **no
  `teamName`**.
- The add-on row is `[class*="addonRow"]` (its checkbox by role).
- Stripe card fields live directly in the `embedded-checkout-inner` frame as
  `#cardNumber` / `#cardExpiry` / `#cardCvc` / `#billingName` /
  `#billingPostalCode`. Card is a collapsed radio row — select it via
  `[data-testid="card-accordion-item"]`; submit via
  `[data-testid="hosted-payment-submit-button"]`. "Save my information" (Link)
  is turned off so the flow stays a plain card payment.
- The minicart flyout is the `dialog` named **"Your cart"**; its Checkout button
  is by role.
- Link's phone field, when present, is `#phoneNumber` (the country code defaults
  to US); "Save my information" is `#enableStripePass`.

## Residual nondeterminism

The form's shape varies with Stripe's own risk/eligibility decisions — extra
billing fields, whether the Link "Save my information" section is offered, and
the presence of the phone field all depend on it. The spec handles those
conditionally rather than pinning one shape. Stripe also serves an hCaptcha
challenge to a headless browser, which is why the project runs **headed** (and
CI under `xvfb-run`); a headed browser has passed it invisibly on every run. If
Stripe ever presents a _visual_ captcha challenge to the headed browser, that
step is the one thing here that cannot be automated without mocking Checkout.

## The superseded contract

Unlike the production smoke, this suite is **not** read-only — writing is the
point. It is made safe by the loopback guard rather than by abstaining from
writes.
