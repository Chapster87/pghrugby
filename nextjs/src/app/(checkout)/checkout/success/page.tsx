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

import {
  getOrder,
  recordOrder,
  type OrderRecord,
} from "@/lib/checkout/record-order"
import {
  returnPageView,
  type ReturnIcon,
  type ReturnView,
} from "@/lib/checkout/return-page-view"

import s from "./styles.module.css"

/**
 * Success page — the embedded Checkout `return_url` target
 * (/checkout/success?session_id=...).
 *
 * On arrival it records the order through the same `recordOrder` path the
 * webhook uses (fast path — the webhook stays the source of truth because the
 * customer isn't guaranteed to reach this page; first writer wins), guarded by
 * `onlyWhenComplete` so a stale/expired session_id in the return URL can never
 * create an order row. The winning prototype variant (hero header + order
 * receipt + styled registration details on a white rounded container) renders
 * the outcome, branched on session/payment status via `returnPageView`.
 */

const ICONS: Record<ReturnIcon, typeof CheckCircle2> = {
  check: CheckCircle2,
  clock: Clock,
  "x-circle": XCircle,
  "alert-triangle": AlertTriangle,
  "alert-circle": AlertCircle,
  "rotate-ccw": RotateCcw,
  "search-x": SearchX,
}

function cap(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

/** Formats cents → "$1,234.56". */
function formatMoney(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100)
}

/** The dense order receipt (meta + line items + totals). */
function OrderReceipt({
  order,
  statusLabel,
}: {
  order: OrderRecord
  statusLabel: string
}) {
  return (
    <section className={s.card}>
      <h2 className={s.cardTitle}>Order receipt</h2>
      <dl className={s.meta}>
        <div className={s.metaRow}>
          <dt>Order reference</dt>
          <dd>{order.session_id}</dd>
        </div>
        <div className={s.metaRow}>
          <dt>Customer</dt>
          <dd>
            {[order.customer_name, order.customer_email]
              .filter(
                (part): part is string =>
                  typeof part === "string" && part.length > 0
              )
              .join(" · ") || "Not provided"}
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
          {order.line_items.map((item) => (
            <tr key={`${item.sku ?? item.description}-${item.quantity}`}>
              <td>{item.description}</td>
              <td>{item.quantity}</td>
              <td className={s.num}>
                {formatMoney(item.amount_total, order.currency)}
              </td>
            </tr>
          ))}
          {order.amount_tax ? (
            <tr>
              <td>Tax</td>
              <td>—</td>
              <td className={s.num}>
                {formatMoney(order.amount_tax, order.currency)}
              </td>
            </tr>
          ) : null}
          <tr className={s.totalRow}>
            <td colSpan={2}>Total</td>
            <td className={`${s.num} ${s.grandTotal}`}>
              {formatMoney(order.amount_total, order.currency)}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}

/** Friendly division labels for the tournament registration shape (mirrors
 *  the sc7s-* skus in lib/checkout/catalog.ts; falls back to the raw sku). */
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

/**
 * Registration details rendered as readable data, not raw JSON. Handles the
 * two known flow shapes (golf = captain + golfers, tournament = division +
 * team name + contact); anything else falls back to the payload as-is.
 */
function RegistrationDetails({ registration }: { registration: unknown }) {
  if (registration === null || typeof registration !== "object") {
    return null
  }
  const reg = registration as Record<string, unknown>
  const golfers = reg.golfers

  if (Array.isArray(golfers)) {
    return (
      <section className={s.card}>
        <h2 className={s.cardTitle}>Registration details</h2>
        <dl className={s.regList}>
          <div className={s.regRow}>
            <dt className={s.regLabel}>Captain</dt>
            <dd className={s.regValue}>{personLabel(reg.captain)}</dd>
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

  if (typeof reg.division === "string") {
    const division = reg.division
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
            <dd className={s.regValue}>{strOr(reg.teamName)}</dd>
          </div>
          <div className={s.regRow}>
            <dt className={s.regLabel}>Contact</dt>
            <dd className={s.regValue}>{personLabel(reg.contact)}</dd>
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

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id: sessionId } = await searchParams

  let order: OrderRecord | null = null
  let error: string | null = null

  if (!sessionId) {
    error =
      "Missing session_id — this page is only reached from embedded Checkout's return_url."
  } else {
    try {
      // Fast path with the non-complete guard: a stale/expired session_id in
      // the return URL must not create an order row, so recordOrder only
      // writes when the Checkout Session is complete.
      order =
        (await getOrder(sessionId)) ??
        (await recordOrder(sessionId, { onlyWhenComplete: true }))
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to retrieve session"
    }
  }

  const view: ReturnView = error
    ? {
        state: "not-found",
        label: "Error",
        heading: "Checkout",
        message: error,
        tone: "danger",
        icon: "search-x",
        ctaLabel: "Back to cart",
        ctaHref: "/cart",
      }
    : returnPageView(order)

  const Icon = ICONS[view.icon]

  return (
    <main className={s.innerBody}>
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
            {order.registration ? (
              <RegistrationDetails registration={order.registration} />
            ) : null}
          </div>
        )}
      </div>
    </main>
  )
}
