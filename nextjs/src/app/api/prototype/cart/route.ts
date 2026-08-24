import { NextResponse } from "next/server"

import {
  PROTOTYPE_CATALOG,
  PROTOTYPE_MAX_GOLFERS,
} from "@/lib/prototype-stripe/catalog"
import {
  createCart,
  listCarts,
  type PrototypeFlow,
} from "@/lib/prototype-stripe/store"

/**
 * PROTOTYPE — cart route.
 *
 * POST /api/prototype/cart — build a server-authoritative cart from client
 * selections. The client only sends selections; amounts come from the catalog.
 * Returns { cartRef, cart } so the UI can show what the server computed.
 *
 * GET /api/prototype/cart — debug: dump the in-memory carts.
 */

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const flow: PrototypeFlow = body.flow

  if (flow !== "dues-donation" && flow !== "golf") {
    return NextResponse.json(
      { error: "flow must be 'dues-donation' or 'golf'" },
      { status: 400 }
    )
  }

  let donationIndex: number | undefined
  if (flow === "dues-donation" && typeof body.donationIndex === "number") {
    donationIndex = body.donationIndex
    if (
      donationIndex === undefined ||
      donationIndex < 0 ||
      donationIndex >= PROTOTYPE_CATALOG.donationPresets.length
    ) {
      return NextResponse.json(
        { error: "donationIndex is not a valid catalog preset" },
        { status: 400 }
      )
    }
  }

  let golfers: { name: string; email: string }[] | undefined
  if (flow === "golf" && Array.isArray(body.golfers)) {
    golfers = body.golfers
      .slice(0, PROTOTYPE_MAX_GOLFERS)
      .map((g: { name?: string; email?: string }) => ({
        name: g?.name?.trim?.() ?? "",
        email: g?.email?.trim?.() ?? "",
      }))
  }

  const quantity =
    typeof body.quantity === "number" && Number.isFinite(body.quantity)
      ? Math.min(Math.max(1, body.quantity), PROTOTYPE_MAX_GOLFERS)
      : 1

  const cart = createCart({ flow, quantity, donationIndex, golfers })

  return NextResponse.json({ cartRef: cart.cartRef, cart })
}

export async function GET() {
  return NextResponse.json({ carts: listCarts() })
}
