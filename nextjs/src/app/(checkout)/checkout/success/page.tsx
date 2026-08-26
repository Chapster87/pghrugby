import Link from "next/link"

import { getOrder, recordOrder } from "@/lib/checkout/record-order"

import s from "./styles.module.css"

/**
 * Success page — the embedded Checkout `return_url` target
 * (/checkout/success?session_id=...).
 *
 * On arrival it records the order through the same `recordOrder` path the
 * webhook uses (fast path — the webhook stays the source of truth because the
 * customer isn't guaranteed to reach this page; first writer wins). Branches
 * on session status: `complete` → success; anything else → tell the user the
 * payment didn't complete and point back to the cart.
 */

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id: sessionId } = await searchParams

  if (!sessionId) {
    return (
      <main className={s.main}>
        <h1 className={s.title}>Checkout</h1>
        <p className={s.error}>
          Missing session_id — this page is only reached from embedded
          Checkout&apos;s return_url.
        </p>
        <p>
          <Link href="/cart" className={s.link}>
            ← Back to cart
          </Link>
        </p>
      </main>
    )
  }

  let order
  let error: string | null = null

  try {
    order = (await getOrder(sessionId)) ?? (await recordOrder(sessionId))
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to retrieve session"
  }

  if (error || !order) {
    return (
      <main className={s.main}>
        <h1 className={s.title}>Checkout</h1>
        <p className={s.error}>
          {error ?? "Order not found"} — please check your email for a
          confirmation, or try again.
        </p>
        <p>
          <Link href="/cart" className={s.link}>
            ← Back to cart
          </Link>
        </p>
      </main>
    )
  }

  if (order.session_status !== "complete") {
    return (
      <main className={s.main}>
        <h1 className={s.title}>Payment not completed</h1>
        <p>
          Session status is “{order.session_status}” (payment status:{" "}
          {order.payment_status}). The payment did not finish — go back and try
          again.
        </p>
        <p>
          <Link href="/cart" className={s.link}>
            ← Back to cart
          </Link>
        </p>
      </main>
    )
  }

  return (
    <main className={s.main}>
      <h1 className={s.title}>Thank you — order confirmed</h1>
      <p className={s.lede}>
        Your payment went through. A confirmation is on its way to{" "}
        {order.customer_email ?? "your email"}.
      </p>

      <section className={s.card}>
        <h2 className={s.cardTitle}>Order summary</h2>
        <dl className={s.meta}>
          <div className={s.metaRow}>
            <dt>Order reference</dt>
            <dd>{order.session_id}</dd>
          </div>
          {order.customer_name && (
            <div className={s.metaRow}>
              <dt>Customer</dt>
              <dd>{order.customer_name}</dd>
            </div>
          )}
          {order.customer_email && (
            <div className={s.metaRow}>
              <dt>Email</dt>
              <dd>{order.customer_email}</dd>
            </div>
          )}
          <div className={s.metaRow}>
            <dt>Total</dt>
            <dd>
              ${((order.amount_total ?? 0) / 100).toFixed(2)}{" "}
              {order.currency.toUpperCase()}
              {order.amount_tax ? (
                <span className={s.muted}>
                  {" "}
                  (incl. ${(order.amount_tax / 100).toFixed(2)} tax)
                </span>
              ) : null}
            </dd>
          </div>
        </dl>

        <h3 className={s.sectionTitle}>Line items</h3>
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
                  ${((item.amount_total ?? 0) / 100).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {order.registration ? (
          <div className={s.registration}>
            <h3 className={s.sectionTitle}>
              Registration details (captured with your order)
            </h3>
            <pre className={s.payload}>
              {JSON.stringify(order.registration, null, 2)}
            </pre>
          </div>
        ) : null}
      </section>

      <p>
        <Link href="/" className={s.link}>
          ← Back to the club site
        </Link>
      </p>
    </main>
  )
}
