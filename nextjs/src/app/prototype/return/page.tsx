import Link from "next/link"

import { getOrder, recordOrder } from "@/lib/prototype-stripe/store"

import styles from "../prototype.module.css"

/**
 * PROTOTYPE — return page (the embedded Checkout `return_url`).
 *
 * On arrival it retrieves the session and records the order through the same
 * `recordOrder` path the webhook uses (fast path — the webhook stays the
 * source of truth because the customer isn't guaranteed to reach this page).
 * Branches on session status: `complete` → success; anything else → tell the
 * user the payment didn't complete and point back to the cart.
 */
export default async function ReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const { session_id: sessionId } = await searchParams

  if (!sessionId) {
    return (
      <main className={styles.main}>
        <h1>Return page</h1>
        <div className={styles.error}>
          Missing session_id — this page is only reached from embedded
          Checkout’s return_url.
        </div>
        <p>
          <Link href="/prototype/cart">← Back to cart</Link>
        </p>
      </main>
    )
  }

  let order = getOrder(sessionId)
  let error: string | null = null

  if (!order) {
    try {
      order = await recordOrder(sessionId)
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to retrieve session"
    }
  }

  if (error || !order) {
    return (
      <main className={styles.main}>
        <h1>Return page</h1>
        <div className={styles.error}>{error ?? "Order not found"}</div>
        <p>
          <Link href="/prototype/cart">← Back to cart</Link>
        </p>
      </main>
    )
  }

  if (order.sessionStatus !== "complete") {
    return (
      <main className={styles.main}>
        <h1>Payment not completed</h1>
        <p>
          Session status is “{order.sessionStatus}” (payment status:{" "}
          {order.paymentStatus}). The payment did not finish — go back and try
          again.
        </p>
        <p>
          <Link href="/prototype/cart">← Back to cart</Link>
        </p>
      </main>
    )
  }

  return (
    <main className={styles.main}>
      <h1>Order recorded ✓</h1>
      <p>
        This order was recorded by the return page fast path (webhook is
        authoritative). Verify the webhook path with{" "}
        <code>GET /api/prototype/orders</code> after paying via{" "}
        <code>stripe listen</code>.
      </p>

      <table className={styles.state}>
        <tbody>
          <tr>
            <th>Session id</th>
            <td>{order.sessionId}</td>
          </tr>
          <tr>
            <th>Cart reference</th>
            <td>{order.cartRef ?? "—"}</td>
          </tr>
          <tr>
            <th>Flow</th>
            <td>{order.flow ?? "—"}</td>
          </tr>
          <tr>
            <th>Session status</th>
            <td>{order.sessionStatus}</td>
          </tr>
          <tr>
            <th>Payment status</th>
            <td>{order.paymentStatus}</td>
          </tr>
          <tr>
            <th>Customer email</th>
            <td>{order.customerEmail ?? "—"}</td>
          </tr>
          <tr>
            <th>Total</th>
            <td>
              ${(order.amountTotal / 100).toFixed(2)} {order.currency}
            </td>
          </tr>
          <tr>
            <th>Recorded at</th>
            <td>{order.recordedAt}</td>
          </tr>
        </tbody>
      </table>

      <h2>Line items</h2>
      <table className={styles.state}>
        <thead>
          <tr>
            <th>Description</th>
            <th>Qty</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {order.lineItems.map((item) => (
            <tr key={item.description}>
              <td>{item.description}</td>
              <td>{item.quantity}</td>
              <td>${(item.amountTotal / 100).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {order.registration ? (
        <>
          <h2>Registration payload (joined by client_reference_id)</h2>
          <table className={styles.state}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {order.registration.map((golfer, i) => (
                <tr key={i}>
                  <td>{golfer.name || "—"}</td>
                  <td>{golfer.email || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p>
          <em>No registration payload for this order.</em>
        </p>
      )}

      <p style={{ marginTop: 24 }}>
        <Link href="/prototype/cart">← Build another cart</Link>
      </p>
    </main>
  )
}
