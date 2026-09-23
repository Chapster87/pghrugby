import { NextResponse } from "next/server"

import { createCartFromEntries } from "@/lib/checkout/cart-store"

/**
 * POST /api/checkout/cart  { cartRef, entries }
 *
 * The flyout's Checkout action: persists the browser-held cart as the `carts`
 * snapshot the session build reads and `recordOrder` re-joins by
 * `client_reference_id`.
 *
 * Amounts stay server-side — entries carry skus and quantities, never prices —
 * and an unknown sku is rejected rather than dropped, so the snapshot can only
 * describe the cart the buyer actually built.
 *
 * Returns: { cartRef, cart }
 */

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const cartRef = (body as { cartRef?: unknown }).cartRef
  if (typeof cartRef !== "string" || !cartRef.trim()) {
    return NextResponse.json({ error: "cartRef is required" }, { status: 400 })
  }

  try {
    const cart = await createCartFromEntries({
      cartRef: cartRef.trim(),
      entries: (body as { entries?: unknown }).entries,
    })
    return NextResponse.json({ cartRef: cart.cartRef, cart })
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
