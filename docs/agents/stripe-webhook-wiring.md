# Wiring live Stripe webhooks to `/api/checkout/webhook`

Status: **operational runbook** — cutover work for
[Wire live Stripe webhooks to /api/checkout/webhook before cutover (#118)](https://github.com/Chapster87/pghrugby/issues/118).

The handler is already built (`src/app/api/checkout/webhook/route.ts`,
`src/lib/checkout/record-order.ts`). What is missing is the **wiring**: a
registered event destination on the live account, the signing secret in the
production environment, and verification against live traffic. Until that is
done, nothing receives live events — a refund made in the Dashboard leaves
`orders.refund_status` at `"none"`, so `/checkout/success` reports "Paid" for an
order the club has refunded.

**`stripe listen --forward-to` does not prove this.** A tunnel exercises the
handler against test events; it says nothing about whether the deployed endpoint
is registered, reachable, or holding the right secret. Only a live event does.

## 1. The endpoint and the events

- **URL:** `https://next.pghrugby.com/api/checkout/webhook` (the production
  deploy's pre-cutover origin, ADR-0001). At cutover this becomes the apex — see
  § 5.
- **Events** (exactly the route's event map — no more, no less):

  | Event                                      | Handler effect                                               |
  | ------------------------------------------ | ------------------------------------------------------------ |
  | `checkout.session.completed`               | `recordOrder` — inserts the header + child rows (idempotent) |
  | `checkout.session.async_payment_succeeded` | `payment_status` → `paid`                                    |
  | `checkout.session.async_payment_failed`    | `payment_status` → `unpaid`                                  |
  | `checkout.session.expired`                 | acked, no row (drop policy)                                  |
  | `charge.refunded`                          | `refunded_amount` + `refund_status` by `payment_intent_id`   |

- **Precondition:** only the `production` deploy context is on live Stripe
  (ADR-0001); branch deploys and previews stay on test and need no endpoint.
  Confirm `STRIPE_ENV=live` and the live keys reach production.

## 2. Register the endpoint (live account)

`scripts/provision-stripe-webhook.mjs` is idempotent by an **exact** URL match: it
creates the destination if none is registered at the target URL, corrects
`enabled_events` if one is, and never deletes. A near-identical URL (a trailing
slash, the other scheme) is a _different_ destination and gets its own endpoint.
Dry-run first:

```sh
nvm use
pnpm provision:stripe:webhook           # inventory + plan, no writes
pnpm provision:stripe:webhook:apply     # create/update, then print the secret
```

It reads `STRIPE_SECRET_KEY_LIVE` from `.env.local` and refuses any key that is
not `sk_live_…`.

Stripe returns the endpoint's `whsec_…` signing secret **only in the create
response**, so the script prints it once on creation. Copy it in the same breath —
if you lose it, reveal it in Workbench → **Webhooks** (or roll it) rather than
re-creating the endpoint.

## 3. Put the secret in the production environment

The route picks the live signing secret when `STRIPE_ENV=live`, preferring
`STRIPE_WEBHOOK_SECRET_LIVE` and falling back to the canonical
`STRIPE_WEBHOOK_SECRET` (`src/lib/checkout/stripe.ts`). Set the `_LIVE` name so
it sits beside — and wins over — any canonical value already there:

```sh
npx netlify-cli@latest env:set STRIPE_WEBHOOK_SECRET_LIVE --context production --secret
```

Paste the `whsec_…` when prompted, so it never lands in shell history. The
equivalent UI path is **Site configuration → Environment variables → Add a
variable**, scoped to **Production**, marked **Sensitive**.

A new variable reaches the running functions only after a redeploy. Confirm the
deployed function actually holds the right secret: Workbench → **Events** → a
recent live event → **Resend** (or
`stripe events resend <event_id> --webhook-endpoint=<endpoint_id>`), then check
the delivery shows `Delivered` (`2xx`). A wrong secret fails `constructEvent` and
shows as `Failed`. Re-running a past event is safe — every write the handler makes
is idempotent or a targeted status update.

## 4. Verify against live traffic

Each acceptance criterion, with how to observe it. Run the reads from the repo
root (they use the service role via `.env.local`):

```sh
node --env-file=.env.local scripts/supabase-query.mjs orders \
  "select=session_id,payment_intent_id,payment_status,session_status,refund_status,refunded_amount,customer_email&order=created_at.desc&limit=5"
```

- **A live `checkout.session.completed` writes the row, alone.** Make a real
  purchase, then **close the tab before the return redirect completes** (or
  otherwise never open `/checkout/success`). The `orders` row and its child rows
  must exist afterwards. That is the webhook writing, not the success page's fast
  path.
- **A live refund flips the order.** Refund the charge in the Dashboard, then
  re-read `orders`: `refund_status` becomes `refunded` (or `partial`, from the
  charge's aggregate `amount_refunded`) with a matching `refunded_amount`, and
  `/checkout/success` reports it. This is the exact case that was invisible
  before wiring.
- **An async payment updates an existing row.** `checkout.session.completed` fires
  first with `payment_status: processing`; the later `async_payment_succeeded` /
  `_failed` moves it to `paid` / `unpaid`. This is the hardest criterion to stage:
  it needs a delayed-notification method enabled for the live account
  (**Settings → Payment methods**, e.g. US bank debit) and a small real payment.
  Confirm the row lands as `processing`, then watch `payment_status` settle to
  `paid` (or `unpaid` on a failed debit). The route also repairs a missing row if
  a transition arrives before the completed event, so assert the row exists _and_
  ends on the right status whichever order the events land in. If no delayed
  method can be enabled, leave this unexercised rather than claiming it.
- **A bad signature is refused, and the unmatched-refund alert fires.**
  - _Bad signature:_ `curl -i -X POST https://next.pghrugby.com/api/checkout/webhook -H "stripe-signature: t=1,v1=deadbeef" -H "content-type: application/json" -d '{"id":"evt_probe","type":"checkout.session.expired"}'`
    → `400` with `Webhook signature verification failed`.
  - _Unmatched refund:_ the alert is in `route.ts`'s `charge.refunded` branch,
    which fires when no `orders` row carries the charge's `payment_intent_id`.
    It needs a live charge whose PaymentIntent really is absent from `orders` —
    realistically one taken outside this Checkout, or recorded without a
    PaymentIntent. If wiring happened before the first live order, every live
    charge will have a row and there is nothing to trip; do **not** manufacture a
    live payment or delete a row to force it. Read the function logs (Netlify UI →
    the deploy's **Functions** tab, or
    `npx netlify-cli@latest logs --source functions [--follow]`) for
    `[webhook] ALERT: charge.refunded for unknown payment_intent …`.

Also worth a glance: Workbench → **Webhooks → Event deliveries** shows each
delivery as `Delivered` / `Pending` / `Failed` — a `2xx` is the proof the endpoint
received it. Stripe retries failures for up to three days in live mode.

## 5. At cutover, re-point the endpoint

`next.pghrugby.com` becomes a domain alias and canonical-redirects to the apex.
**Stripe treats a `3xx` as a delivery failure**, so the endpoint URL must move to
the apex before the `next.` host stops serving:

- **Preferred:** edit the existing endpoint's URL in Workbench to
  `https://pghrugby.com/api/checkout/webhook`. The signing secret is _per
  endpoint_, so editing the URL keeps it and Netlify needs no change.
- Re-running the script with `--url=https://pghrugby.com/api/checkout/webhook`
  instead creates a **second** endpoint with a **new** secret (idempotency is by
  exact URL) — then set the new secret and delete the old endpoint.

## 6. Rollback

Disable the endpoint in Workbench → **Webhooks**. Deliveries stop; orders are
still recorded by the success page's fast path, but refunds and async-payment
transitions go invisible again (the original symptom). If the secret is leaked,
**Roll secret** in Workbench and re-set the variable.

## 7. Out of scope

- **Aggregate refunds only** — no `refund.*` subscriptions and no per-refund rows
  (`route.ts`'s documented contract).
- Details on the order/reporting surface: `docs/agents/order-records-and-reporting.md`
  § 4–5. Club-facing reporting UI is [Order records portal + transactional email (#67)](https://github.com/Chapster87/pghrugby/issues/67).
- **Disputes** are neither handled nor subscribed.

Primary source for delivery behaviour (retries, `3xx` treated as failure, secret
rolling/retrieval): [Receive Stripe events in your webhook endpoint](https://docs.stripe.com/webhooks).
