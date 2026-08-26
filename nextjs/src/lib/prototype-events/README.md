# Prototype: Stripe event edge cases — async payments, refunds, expired sessions

PROTOTYPE — throwaway. Answers a question, then gets deleted or absorbed into the
real write path (`src/lib/checkout/record-order.ts` + the webhook).

## The question

How should the orders write path handle the Stripe events the checkout
replacement deliberately deferred — async payment outcomes, refunds, and
expired/abandoned sessions — and when does the first-writer-wins `DO NOTHING`
upsert switch to `DO UPDATE` status transitions?

Currently `POST /api/checkout/webhook` records only `checkout.session.completed`
via `recordOrder` (`insert ... on conflict (session_id) do nothing`), which
locks in `payment_status`/`session_status` on the first write. The prototype
pushes the deferred events through the state model to pin down:

- the event → transition mapping,
- the **frozen vs mutable** field split,
- the `DO NOTHING` → `DO UPDATE` switch (and why `recordOrder` itself must
  **stay** `DO NOTHING`),
- what `/checkout/success` should show for non-`paid` outcomes.

## Run it

```bash
pnpm prototype:events         # interactive — drive the five scenarios yourself
pnpm prototype:events --smoke # headless — run all five scenarios, print the transcript
```

Keys: `n` next scenario · `1` webhook completed · `2` return-page fast path ·
`3` async succeeded · `4` async failed · `5` expired · `6` charge.refunded ·
`7` refund.created→updated · `t` toggle recordExpired · `q` quit.

Scenarios: S1 instant card happy path · S2 delayed ACH succeeds ·
S3 delayed ACH fails · S4 refund cycle · S5 abandoned session expires.

## How to read a frame

- **orders row** — the status slice of the row. `*` marks mutable status fields;
  everything else (amounts, line items, customer, `payment_intent_id`) is frozen
  at first write.
- **last write plan** — the SQL the real handler would emit for that event:
  `insert ... on conflict (session_id) do nothing` for the first write, or a
  targeted `update ... set <status cols>` for status transitions.
- **/checkout/success view** — what the return page should render for the
  current state.

## What to react to

1. **`payment_intent_id` column.** `charge.refunded`/`refund.*` events reference
   a PaymentIntent, and PaymentIntent has **no reverse link** to its Checkout
   Session. Without `payment_intent_id` captured at first write, refunds can't
   be reconciled to an order row. Worth adding to `orders`?
2. **Refund representation.** Minimal (`refunded_amount` + `refund_status`) vs
   the `refunds` JSONB array (per-refund status, so `refund.updated` can flip
   `pending → succeeded`). The club has no customer-facing order history — is
   per-refund detail needed, or is the aggregate enough?
3. **Expired sessions.** Two policies for abandoned sessions with no row:
   (a) ack and drop (today's behavior — `collected_information` is lost), or
   (b) insert a lead row with `session_status=expired` so the club can follow up.
   Note: Stripe's session `status` enum is `open | complete | expired` — the
   migration comment listing `abandoned` isn't a real Stripe value.
4. **Return page.** Today `/checkout/success` shows "order confirmed" whenever
   `session_status === 'complete'` — wrong for `processing` (delayed methods)
   and `unpaid` (async failure). The prototype branches on `payment_status`.
5. **`recordExpired` + recovery.** Whether the abandoned-session recovery flow
   (`recovered_from` on a new session) matters for embedded Checkout, and
   whether `after_expiration` should be enabled.

Verified Stripe facts (docs.stripe.com, 2026-08-25) are cited inline in
`events-logic.ts`.
