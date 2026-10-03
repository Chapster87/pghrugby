/**
 * Integration port of the Stripe webhook route — map #126 decision 6, ticket
 * #129.
 *
 * Drives the real `POST` in `src/app/api/checkout/webhook/route.ts` with a
 * `checkout.session.completed` payload signed by the Stripe SDK against the same
 * dummy `STRIPE_WEBHOOK_SECRET` the route verifies with, then reads the durable
 * rows back through the app's real transport (PostgREST) to prove the handler
 * records the order exactly as the order-storage port asserts.
 *
 * The one deliberate seam: the route discards the event's `data.object` and
 * re-fetches the session (`recordOrder` → `stripe.checkout.sessions.retrieve`),
 * so a signed payload alone cannot drive the write. That single retrieve is spied
 * to resolve the fixture below — no live Stripe call is made. Everything else is
 * real: the handler, `stripe.webhooks.constructEvent` over the dummy secret, the
 * `recordOrder` builders, and the PostgREST writes/reads. Nothing else is mocked.
 *
 * Replaying the identical signed payload asserts idempotency: `recordOrder` sees
 * the existing row (`first writer wins on session_id`) and inserts nothing new.
 */

import Stripe from "stripe"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

import { POST } from "@/app/api/checkout/webhook/route"
import type { CartEntry } from "@/lib/checkout/cart-entries"
import {
  orderLineId,
  type OrderLine,
  type OrderRecord,
  type OrderRegistration,
} from "@/lib/checkout/order-rows"
import { STRIPE_WEBHOOK_SECRET, stripe } from "@/lib/checkout/stripe"
import { insertIgnoreDuplicates, selectRows } from "@/lib/checkout/supabase"

const SESSION_ID = "cs_webhook_route_integration"
const CART_REF = "cart-webhook-route-integration"
const PI_ID = "pi_webhook_route_integration"
const TAMPERED_SESSION_ID = "cs_webhook_route_tampered"

/** The flagship mixed cart: registration + collector answers + add-on, dues, donation. */
const ENTRIES: CartEntry[] = [
  {
    id: "line-golf",
    kind: "product",
    sku: "golf-outing-registration",
    quantity: 3,
    sourcePdp: "golf-outing",
    groupRef: "group-golf",
  },
  {
    id: "collector-golf",
    kind: "collector",
    collectorRef: "golf-outing-collector",
    answers: {
      captainName: "Jane Smith",
      golfers: ["Mike Torres", "Priya Nair"],
      teamName: "Forge Old Boys",
    },
    fields: [
      {
        name: "captainName",
        label: "Captain name",
        type: "text",
        required: true,
      },
      {
        name: "golfers",
        label: "Golfer name",
        type: "text",
        required: true,
        repeatable: true,
        max: 3,
      },
    ],
    sourcePdp: "golf-outing",
    groupRef: "group-golf",
    parentId: "line-golf",
  },
  {
    id: "line-mulligan",
    kind: "product",
    sku: "golf-outing-mulligan",
    quantity: 3,
    sourcePdp: "golf-outing",
    groupRef: "group-golf",
    parentId: "line-golf",
  },
  {
    id: "line-dues",
    kind: "product",
    sku: "dues-fall",
    quantity: 1,
    sourcePdp: "dues",
    groupRef: "group-dues",
  },
  {
    id: "line-donation",
    kind: "product",
    sku: "donation-club-preset-50",
    quantity: 1,
    sourcePdp: "donate",
    groupRef: "group-dues",
  },
]

/**
 * A Checkout Session as `recordOrder` retrieves it (with `line_items.data.price.product`
 * and `payment_intent` expanded). Mirrors the order-storage port's fixture so the
 * same four priced lines and one registration are derived.
 */
function sessionFixture(id: string): Stripe.Checkout.Session {
  return {
    id,
    client_reference_id: CART_REF,
    currency: "usd",
    amount_total: 72000,
    total_details: { amount_tax: 0 },
    payment_intent: PI_ID,
    payment_status: "paid",
    status: "complete",
    customer_details: { email: "jane@example.com", name: "Jane Smith" },
    collected_information: null,
    metadata: {
      families: "golf,dues,donation",
      reg_0: "Golf Outing Registration x3: Jane Smith, Mike Torres, Priya Nair",
      reg_count: "1",
      reg_ref: CART_REF,
    },
    line_items: {
      data: [
        {
          description: "Golf Outing Registration",
          quantity: 3,
          amount_total: 33000,
          price: {
            unit_amount: 11000,
            product: {
              id: "prod_golf_registration",
              metadata: { family: "golf" },
            },
          },
        },
        {
          description: "Golf Outing — Mulligan (4 + contest entry)",
          quantity: 3,
          amount_total: 9000,
          price: {
            unit_amount: 3000,
            product: {
              id: "prod_golf_mulligan",
              metadata: { family: "golf" },
            },
          },
        },
        {
          description: "Fall 2026 Season Dues",
          quantity: 1,
          amount_total: 25000,
          price: {
            unit_amount: 25000,
            product: { id: "prod_dues_fall", metadata: { family: "dues" } },
          },
        },
        {
          description: "Club donation — $50",
          quantity: 1,
          amount_total: 5000,
          price: {
            unit_amount: 5000,
            product: {
              id: "prod_donation_club_preset_50",
              metadata: { family: "donation" },
            },
          },
        },
      ],
    },
  } as unknown as Stripe.Checkout.Session
}

const SESSION = sessionFixture(SESSION_ID)

/** A `checkout.session.completed` event carrying the fixture session. */
function eventPayload(session: Stripe.Checkout.Session): string {
  return JSON.stringify({
    id: "evt_webhook_route_integration",
    object: "event",
    type: "checkout.session.completed",
    data: { object: session },
  })
}

const PAYLOAD = eventPayload(SESSION)

/** The Stripe SDK's own signer, so the header matches what the route verifies. */
function signed(payload: string, secret: string): string {
  return Stripe.webhooks.generateTestHeaderString({ payload, secret })
}

/** A POST to the route, optionally without a signature header. */
function webhookRequest(payload: string, signature: string | null): Request {
  const headers: Record<string, string> = { "content-type": "application/json" }
  if (signature) headers["stripe-signature"] = signature
  return new Request("http://localhost/api/checkout/webhook", {
    method: "POST",
    headers,
    body: payload,
  })
}

describe("Webhook route — signed checkout.session.completed", () => {
  beforeAll(async () => {
    // The route's `recordOrder` re-joins the cart snapshot by
    // `client_reference_id`; without it the lines lose their provenance and the
    // registration cannot be linked.
    await insertIgnoreDuplicates("carts", [
      {
        cart_ref: CART_REF,
        currency: "usd",
        entries: ENTRIES,
        total: 72000,
      },
    ])

    if (!stripe) {
      throw new Error(
        "STRIPE_SECRET_KEY must be set for the webhook integration spec"
      )
    }
    const stripeClient = stripe
    vi.spyOn(stripeClient.checkout.sessions, "retrieve").mockResolvedValue(
      SESSION as unknown as Stripe.Response<Stripe.Checkout.Session>
    )
  })

  afterAll(() => {
    vi.restoreAllMocks()
  })

  it("accepts a correctly signed event and records the order header", async () => {
    const response = await POST(
      webhookRequest(PAYLOAD, signed(PAYLOAD, STRIPE_WEBHOOK_SECRET!))
    )
    expect(response.status).toBe(200)

    const headers = await selectRows<OrderRecord>(
      "orders",
      "session_id",
      SESSION_ID
    )
    expect(headers.length).toBe(1)
    expect(headers[0].families).toEqual(["golf", "dues", "donation"])
  })

  it("records one order_line per priced line", async () => {
    const lines = await selectRows<OrderLine>(
      "order_lines",
      "session_id",
      SESSION_ID,
      "line_index.asc"
    )
    expect(lines.length).toBe(4)
  })

  it("links the add-on to the golf primary", async () => {
    const lines = await selectRows<OrderLine>(
      "order_lines",
      "session_id",
      SESSION_ID,
      "line_index.asc"
    )
    expect(lines[1]?.parent_line_id).toBe(orderLineId(SESSION_ID, 0))
  })

  it("records the registration tied to the golf primary", async () => {
    const registrations = await selectRows<OrderRegistration>(
      "order_registrations",
      "session_id",
      SESSION_ID
    )
    expect(
      registrations.length === 1 &&
        registrations[0].line_id === orderLineId(SESSION_ID, 0)
    ).toBe(true)
    expect(registrations[0]?.summary).toBe(
      SESSION.metadata!.reg_0 as string
    )
  })

  it("replaying the identical payload inserts nothing new", async () => {
    const headersBefore = await selectRows<OrderRecord>(
      "orders",
      "session_id",
      SESSION_ID
    )
    const linesBefore = await selectRows<OrderLine>(
      "order_lines",
      "session_id",
      SESSION_ID
    )
    const regsBefore = await selectRows<OrderRegistration>(
      "order_registrations",
      "session_id",
      SESSION_ID
    )

    const response = await POST(
      webhookRequest(PAYLOAD, signed(PAYLOAD, STRIPE_WEBHOOK_SECRET!))
    )
    expect(response.status).toBe(200)

    const headersAfter = await selectRows<OrderRecord>(
      "orders",
      "session_id",
      SESSION_ID
    )
    const linesAfter = await selectRows<OrderLine>(
      "order_lines",
      "session_id",
      SESSION_ID
    )
    const regsAfter = await selectRows<OrderRegistration>(
      "order_registrations",
      "session_id",
      SESSION_ID
    )

    expect(
      headersAfter.length === headersBefore.length &&
        linesAfter.length === linesBefore.length &&
        regsAfter.length === regsBefore.length
    ).toBe(true)
    expect(linesAfter.length).toBe(4)
    expect(regsAfter.length).toBe(1)
  })

  it("rejects a tampered payload and writes no rows", async () => {
    const tampered = eventPayload(sessionFixture(TAMPERED_SESSION_ID))
    // A signature over the original body, sent with a modified body.
    const signature = signed(tampered, STRIPE_WEBHOOK_SECRET!)
    const response = await POST(webhookRequest(`${tampered} `, signature))
    expect(response.status).toBe(400)

    const headers = await selectRows<OrderRecord>(
      "orders",
      "session_id",
      TAMPERED_SESSION_ID
    )
    expect(headers.length).toBe(0)
  })

  it("rejects an unsigned payload and writes no rows", async () => {
    const response = await POST(webhookRequest(PAYLOAD, null))
    expect(response.status).toBe(400)

    const headers = await selectRows<OrderRecord>(
      "orders",
      "session_id",
      TAMPERED_SESSION_ID
    )
    expect(headers.length).toBe(0)
  })
})
