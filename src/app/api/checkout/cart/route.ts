import { NextResponse } from "next/server"

import {
  refusalResponse,
  resolveCartFromEntries,
} from "@/lib/checkout/cart-store"
import { resolveCartDiscount } from "@/lib/checkout/cart-discount"

/**
 * POST /api/checkout/cart  { cartRef, entries, promotionCode? }
 *
 * The add-time resolve/validate call: resolves every priced line against
 * DatoCMS (availability + the effective Stripe Price id) and returns the quoted
 * unit amounts, plus the resolved SC7s discount so the flyout can show the
 * saving the session build will apply. **It does not persist** — the `carts`
 * snapshot is written at session build, so what `recordOrder` re-joins is the
 * checkout-time cart, not an earlier one (`docs/pdp-to-minicart-to-checkout-spec.md`
 * § 8.1).
 *
 * A line that cannot be checked out (sold out, unknown sku, no price) answers
 * `409` with `errors`, one entry per offending line, carrying the cart entry id
 * the buyer removes. Lines are never dropped and the whole cart is never
 * blocked by one bad line.
 *
 * Returns: { cartRef, currency, lines, total, discount } | { error, errors }
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

  const promotionCode =
    typeof (body as { promotionCode?: unknown }).promotionCode === "string"
      ? ((body as { promotionCode: string }).promotionCode ?? "").trim()
      : ""

  try {
    const cart = await resolveCartFromEntries({
      cartRef: cartRef.trim(),
      entries: (body as { entries?: unknown }).entries,
    })

    if (cart.errors.length > 0) {
      return NextResponse.json(refusalResponse(cart.errors), { status: 409 })
    }

    // Display-only, and never allowed to fail the validate call: an unresolvable
    // discount simply shows no row, leaving the line prices to speak for
    // themselves. The session build remains the authority on what is applied.
    let discount = null
    try {
      discount = await resolveCartDiscount(cart.entries, promotionCode)
    } catch {
      discount = null
    }

    return NextResponse.json({
      cartRef: cart.cartRef,
      currency: cart.currency,
      lines: cart.lines,
      total: cart.total,
      discount,
    })
  } catch (error) {
    // A structural failure (no priced line, unreadable body, DatoCMS
    // unreachable) is not a per-line refusal — it is a retryable request error.
    const message = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
