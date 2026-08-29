import { NextResponse } from "next/server"

import { createCart } from "@/lib/checkout/cart-store"

/**
 * POST /api/checkout/cart
 *
 * Builds a server-authoritative cart from client selections. The client only
 * sends selections (sku + quantity, mirroring what the PDP page rendered) plus
 * an optional registration payload; amounts come from the server catalog and
 * are never client-dictated.
 *
 * Body: { pdp, selections: [{ sku, quantity }], registration? }
 * Returns: { cartRef, cart }
 */

function strings(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const pdp = strings((body as { pdp?: unknown }).pdp)
  if (!pdp) {
    return NextResponse.json({ error: "pdp is required" }, { status: 400 })
  }

  const selections = Array.isArray(
    (body as { selections?: unknown }).selections
  )
    ? (body as { selections: unknown[] }).selections
        .map((s) => {
          if (!s || typeof s !== "object") return null
          const sel = s as { sku?: unknown; quantity?: unknown }
          const sku = strings(sel.sku)
          if (!sku) return null
          const quantity =
            typeof sel.quantity === "number" && Number.isFinite(sel.quantity)
              ? Math.floor(sel.quantity)
              : 1
          return { sku, quantity }
        })
        .filter((s): s is { sku: string; quantity: number } => s !== null)
    : []

  if (selections.length === 0) {
    return NextResponse.json(
      { error: "at least one selection is required" },
      { status: 400 }
    )
  }

  const registration = (body as { registration?: unknown }).registration

  try {
    const cart = await createCart({ pdp, selections, registration })
    return NextResponse.json({ cartRef: cart.cartRef, cart })
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
