/**
 * PROTOTYPE — return-page states for the Stripe edge-cases prototype.
 * Three structurally-different variants of /checkout/success, driven by the
 * (session_status, payment_status) combinations the deferred events produce:
 * paid, processing, unpaid, expired, open, refunded, not-found.
 *
 * Throwaway — the winning variant gets folded into the real
 * /checkout/success page and the rest deleted.
 */

import Link from "next/link"
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RotateCcw,
  SearchX,
  XCircle,
} from "lucide-react"

import s from "./styles.module.css"

export type OrderState =
  | "paid"
  | "processing"
  | "unpaid"
  | "expired"
  | "open"
  | "refunded"
  | "notfound"

export const ORDER_STATES: OrderState[] = [
  "paid",
  "processing",
  "unpaid",
  "expired",
  "open",
  "refunded",
  "notfound",
]

export type Tone = "success" | "warning" | "danger" | "info" | "neutral"

export type StateView = {
  label: string
  heading: string
  message: string
  tone: Tone
  ctaLabel: string
  ctaHref: string
  Icon: typeof CheckCircle2
}

/** The copy each (session, payment) outcome deserves — from events-logic.ts. */
export const STATE_VIEW: Record<OrderState, StateView> = {
  paid: {
    label: "Paid",
    heading: "Thank you — order confirmed",
    message:
      "Your payment went through. A confirmation is on its way to your email.",
    tone: "success",
    ctaLabel: "Back to the club site",
    ctaHref: "/",
    Icon: CheckCircle2,
  },
  processing: {
    label: "Processing",
    heading: "Payment received — confirming",
    message:
      "Your payment is processing and will confirm shortly — bank transfers can take 1–3 business days. You’ll get an email when it lands.",
    tone: "info",
    ctaLabel: "Back to the club site",
    ctaHref: "/",
    Icon: Clock,
  },
  unpaid: {
    label: "Unpaid",
    heading: "Payment failed",
    message:
      "The delayed payment didn’t complete after checkout. Please try again.",
    tone: "danger",
    ctaLabel: "Try again from the cart",
    ctaHref: "/cart",
    Icon: XCircle,
  },
  expired: {
    label: "Expired",
    heading: "Checkout session expired",
    message:
      "The checkout session expired before payment was completed. Build the cart again and try once more.",
    tone: "danger",
    ctaLabel: "Back to cart",
    ctaHref: "/cart",
    Icon: AlertTriangle,
  },
  open: {
    label: "Open",
    heading: "Payment not completed",
    message:
      "The payment didn’t finish. Go back and try again — your cart is still waiting.",
    tone: "warning",
    ctaLabel: "Back to cart",
    ctaHref: "/cart",
    Icon: AlertCircle,
  },
  refunded: {
    label: "Refunded",
    heading: "Order refunded",
    message:
      "This order was refunded. Check the Stripe Dashboard or your email for details.",
    tone: "neutral",
    ctaLabel: "Back to the club site",
    ctaHref: "/",
    Icon: RotateCcw,
  },
  notfound: {
    label: "Not found",
    heading: "Order not found",
    message:
      "We couldn’t find an order for that session. Check your email for a confirmation, or try again.",
    tone: "neutral",
    ctaLabel: "Back to cart",
    ctaHref: "/cart",
    Icon: SearchX,
  },
}

export type FixtureOrder = {
  sessionId: string
  customerName: string
  customerEmail: string
  flow: string
  currency: string
  lineItems: { description: string; quantity: number; amountTotal: number }[]
  amountTotal: number
  amountTax: number
  registration: Record<string, unknown> | null
}

/** Stands in for a recorded order row; identical across variants. */
export const FIXTURE_ORDER: FixtureOrder = {
  sessionId: "cs_test_a1B2c3D4e5",
  customerName: "Lisa Golovchenko",
  customerEmail: "lisa@example.com",
  flow: "golf",
  currency: "USD",
  lineItems: [
    {
      description: "Golf outing — registration",
      quantity: 2,
      amountTotal: 11000,
    },
    { description: "Drink band", quantity: 1, amountTotal: 1500 },
  ],
  amountTotal: 12500,
  amountTax: 0,
  registration: {
    captain: { name: "Lisa Golovchenko", email: "lisa@example.com" },
    golfers: [
      { name: "Lisa Golovchenko", email: "lisa@example.com" },
      { name: "Marcus Webb", email: "marcus@example.com" },
    ],
  },
}

/** Formats cents → "$1,234.56". */
export function formatMoney(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100)
}

/** Variant C step derivation: where is the customer in the flow? */
export function stepsFor(
  state: OrderState
): {
  label: string
  status: "done" | "current" | "pending" | "failed" | "expired" | "neutral"
}[] {
  if (state === "notfound") {
    return [
      { label: "Cart", status: "neutral" },
      { label: "Payment", status: "neutral" },
      { label: "Confirmation", status: "neutral" },
    ]
  }
  const payment =
    state === "open" ? "current" : state === "expired" ? "expired" : "done"
  const confirmation =
    state === "paid" || state === "refunded"
      ? "done"
      : state === "processing"
      ? "current"
      : state === "unpaid"
      ? "failed"
      : "pending"
  return [
    { label: "Cart", status: "done" },
    { label: "Payment", status: payment },
    { label: "Confirmation", status: confirmation },
  ]
}

// ---------------------------------------------------------------------------
// Shared content blocks: the order receipt and the registration details.
// ---------------------------------------------------------------------------

/** Friendly division labels for the tournament registration shape (mirrors the
 *  sc7s-* skus in lib/checkout/catalog.ts; falls back to the raw sku). */
const DIVISION_LABELS: Record<string, string> = {
  "sc7s-mens-open": "SC7s Men's Open",
  "sc7s-mens-social": "SC7s Men's Social",
  "sc7s-mens-super-social": "SC7s Men's Super Social",
  "sc7s-womens-open": "SC7s Women's Open",
  "sc7s-mens-additional-side": "SC7s Men's Additional Side",
  "sc7s-womens-additional-side": "SC7s Women's Additional Side",
}

/** Renders a { name, email } person as "Name · email", or a fallback. */
function personLabel(value: unknown): string {
  if (value && typeof value === "object") {
    const person = value as { name?: unknown; email?: unknown }
    const parts = [person.name, person.email].filter(
      (part): part is string => typeof part === "string" && part.length > 0
    )
    if (parts.length > 0) return parts.join(" · ")
  }
  return "Not provided"
}

function strOr(value: unknown): string {
  return typeof value === "string" && value.length > 0 ? value : "Not provided"
}

/** The dense order receipt (meta + line items + totals) used by variants A and B. */
function OrderReceipt({
  order,
  statusLabel,
}: {
  order: FixtureOrder
  statusLabel: string
}) {
  return (
    <section className={s.card}>
      <h2 className={s.cardTitle}>Order receipt</h2>
      <dl className={s.meta}>
        <div className={s.metaRow}>
          <dt>Order reference</dt>
          <dd>{order.sessionId}</dd>
        </div>
        <div className={s.metaRow}>
          <dt>Customer</dt>
          <dd>
            {order.customerName} · {order.customerEmail}
          </dd>
        </div>
        <div className={s.metaRow}>
          <dt>Status</dt>
          <dd>{statusLabel}</dd>
        </div>
      </dl>

      <table className={s.table}>
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th className={s.num}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {order.lineItems.map((item) => (
            <tr key={item.description}>
              <td>{item.description}</td>
              <td>{item.quantity}</td>
              <td className={s.num}>
                {formatMoney(item.amountTotal, order.currency)}
              </td>
            </tr>
          ))}
          {order.amountTax > 0 && (
            <tr>
              <td>Tax</td>
              <td>—</td>
              <td className={s.num}>
                {formatMoney(order.amountTax, order.currency)}
              </td>
            </tr>
          )}
          <tr className={s.totalRow}>
            <td colSpan={2}>Total</td>
            <td className={`${s.num} ${s.grandTotal}`}>
              {formatMoney(order.amountTotal, order.currency)}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}

/**
 * Registration details rendered as readable data, not raw JSON. Handles the
 * two known flow shapes (golf = captain + golfers, tournament = division +
 * team name + contact); anything else falls back to the payload as-is.
 */
function RegistrationDetails({
  registration,
}: {
  registration: Record<string, unknown>
}) {
  const golfers = registration.golfers
  if (Array.isArray(golfers)) {
    return (
      <section className={s.card}>
        <h2 className={s.cardTitle}>Registration details</h2>
        <dl className={s.regList}>
          <div className={s.regRow}>
            <dt className={s.regLabel}>Captain</dt>
            <dd className={s.regValue}>{personLabel(registration.captain)}</dd>
          </div>
          <div className={s.regRow}>
            <dt className={s.regLabel}>Golfers ({golfers.length})</dt>
            {golfers.map((golfer, i) => (
              <dd key={i} className={s.regValue}>
                {personLabel(golfer)}
              </dd>
            ))}
          </div>
        </dl>
      </section>
    )
  }

  if (typeof registration.division === "string") {
    const division = registration.division
    return (
      <section className={s.card}>
        <h2 className={s.cardTitle}>Registration details</h2>
        <dl className={s.regList}>
          <div className={s.regRow}>
            <dt className={s.regLabel}>Division</dt>
            <dd className={s.regValue}>
              {DIVISION_LABELS[division] ?? division}
            </dd>
          </div>
          <div className={s.regRow}>
            <dt className={s.regLabel}>Team name</dt>
            <dd className={s.regValue}>{strOr(registration.teamName)}</dd>
          </div>
          <div className={s.regRow}>
            <dt className={s.regLabel}>Contact</dt>
            <dd className={s.regValue}>{personLabel(registration.contact)}</dd>
          </div>
        </dl>
      </section>
    )
  }

  return (
    <section className={s.card}>
      <h2 className={s.cardTitle}>Registration details</h2>
      <pre className={s.payload}>{JSON.stringify(registration, null, 2)}</pre>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Variant A — "Receipt": a document. Status banner on top, dense order receipt,
// registration payload, explicit next action. Closest to today's page.
// ---------------------------------------------------------------------------

export function VariantA({ state }: { state: OrderState }) {
  const view = STATE_VIEW[state]
  const order = state === "notfound" ? null : FIXTURE_ORDER
  const { Icon } = view

  return (
    <div className={`${s.page} ${s[`tone${cap(view.tone)}`]}`}>
      <div className={s.banner}>
        <Icon size={22} className={s.bannerIcon} />
        <h1 className={s.heading}>{view.heading}</h1>
      </div>

      <p className={s.message}>{view.message}</p>

      {order && (
        <>
          <OrderReceipt order={order} statusLabel={view.label} />
          {order.registration && (
            <RegistrationDetails registration={order.registration} />
          )}
        </>
      )}

      <div className={s.actions}>
        <Link className={s.button} href={view.ctaHref}>
          {view.ctaLabel}
        </Link>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Variant B — "Status hero + receipt": the outcome is the story up top (big
// icon + headline + one action), then the order receipt and registration
// details below. The merged direction the human picked.
// ---------------------------------------------------------------------------

export function VariantB({ state }: { state: OrderState }) {
  const view = STATE_VIEW[state]
  const order = state === "notfound" ? null : FIXTURE_ORDER
  const { Icon } = view

  return (
    <div className={`${s.hero} ${s[`tone${cap(view.tone)}`]}`}>
      <Icon size={64} strokeWidth={1.5} className={s.heroIcon} />
      <h1 className={s.heroHeading}>{view.heading}</h1>
      <p className={s.heroMessage}>{view.message}</p>
      <Link className={s.heroCta} href={view.ctaHref}>
        {view.ctaLabel}
      </Link>

      {order && (
        <div className={s.heroDetails}>
          <OrderReceipt order={order} statusLabel={view.label} />
          {order.registration && (
            <RegistrationDetails registration={order.registration} />
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Variant C — "Stepper": where the customer is in the flow. Progress tracker,
// status panel, and a side order summary.
// ---------------------------------------------------------------------------

export function VariantC({ state }: { state: OrderState }) {
  const view = STATE_VIEW[state]
  const order = state === "notfound" ? null : FIXTURE_ORDER
  const steps = stepsFor(state)
  const { Icon } = view

  return (
    <div className={`${s.page} ${s[`tone${cap(view.tone)}`]}`}>
      <ol className={s.steps}>
        {steps.map((step, i) => (
          <li
            key={step.label}
            className={`${s.step} ${s[`step${cap(step.status)}`]}`}
          >
            <span className={s.stepCircle}>
              {step.status === "done" ? "✓" : i + 1}
            </span>
            <span className={s.stepLabel}>{step.label}</span>
          </li>
        ))}
      </ol>

      <div className={s.messagePanel}>
        <Icon size={40} strokeWidth={1.5} className={s.panelIcon} />
        <h1 className={s.heading}>{view.heading}</h1>
        <p className={s.message}>{view.message}</p>
        <Link className={s.button} href={view.ctaHref}>
          {view.ctaLabel}
        </Link>
      </div>

      {order && (
        <div className={s.summaryGrid}>
          <section className={s.card}>
            <h2 className={s.cardTitle}>Order</h2>
            <dl className={s.meta}>
              <div className={s.metaRow}>
                <dt>Reference</dt>
                <dd>{order.sessionId}</dd>
              </div>
              {order.lineItems.map((item) => (
                <div key={item.description} className={s.metaRow}>
                  <dt>
                    {item.description} × {item.quantity}
                  </dt>
                  <dd>{formatMoney(item.amountTotal, order.currency)}</dd>
                </div>
              ))}
              <div className={s.metaRow}>
                <dt>Total</dt>
                <dd className={s.grandTotal}>
                  {formatMoney(order.amountTotal, order.currency)}
                </dd>
              </div>
            </dl>
          </section>

          <section className={s.card}>
            <h2 className={s.cardTitle}>What happens next</h2>
            <ul className={s.nextList}>
              {state === "processing" && (
                <>
                  <li>
                    We’re waiting for the bank transfer to clear (1–3 business
                    days).
                  </li>
                  <li>You’ll get a confirmation email the moment it lands.</li>
                </>
              )}
              {state === "paid" && (
                <>
                  <li>A confirmation email is on its way.</li>
                  <li>The registration details above are locked in.</li>
                </>
              )}
              {state === "refunded" && (
                <li>
                  The refund is on its way back to the original payment method.
                </li>
              )}
              {(state === "unpaid" ||
                state === "open" ||
                state === "expired") && (
                <li>Nothing was charged — no payment went through.</li>
              )}
            </ul>
          </section>
        </div>
      )}
    </div>
  )
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
