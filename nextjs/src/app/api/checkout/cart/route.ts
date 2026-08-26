import { NextResponse } from "next/server"

import {
  CHECKOUT_CATALOG,
  CHECKOUT_MAX_GOLFERS,
} from "@/lib/checkout/catalog"
import { createCart, type CheckoutFlow } from "@/lib/checkout/cart-store"

/**
 * POST /api/checkout/cart
 *
 * Builds a server-authoritative cart from client selections. The client only
 * sends selections (flow, quantity, add-ons, registration payload); amounts
 * come from the server catalog and are never client-dictated.
 *
 * Body: { flow, quantity?, donationPresetIndex?, addons?, golfers?, captain?,
 *         division?, teamName?, contact? }
 * Returns: { cartRef, cart }
 */

const FLOWS = ["dues", "golf", "tournament"] as const

function isFlow(value: unknown): value is CheckoutFlow {
  return typeof value === "string" && (FLOWS as readonly string[]).includes(value)
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const flow = body.flow
  if (!isFlow(flow)) {
    return NextResponse.json(
      { error: "flow must be one of: dues, golf, tournament" },
      { status: 400 }
    )
  }

  // Sanitize numeric inputs.
  const quantity =
    typeof body.quantity === "number" && Number.isFinite(body.quantity)
      ? Math.min(Math.max(1, body.quantity), CHECKOUT_MAX_GOLFERS)
      : undefined

  const donationPresetIndex =
    typeof body.donationPresetIndex === "number" &&
    Number.isInteger(body.donationPresetIndex) &&
    body.donationPresetIndex >= 0 &&
    body.donationPresetIndex < CHECKOUT_CATALOG.donationPresets.length
      ? body.donationPresetIndex
      : undefined

  // Sanitize registration payload fields.
  const strings = (value: unknown) =>
    typeof value === "string" ? value.trim() : ""

  const golfers = Array.isArray(body.golfers)
    ? body.golfers
        .slice(0, CHECKOUT_MAX_GOLFERS)
        .map((g: unknown) => ({
          name: strings(
            typeof g === "object" && g ? (g as { name?: unknown }).name : ""
          ),
          email: strings(
            typeof g === "object" && g ? (g as { email?: unknown }).email : ""
          ),
        }))
    : undefined

  const captain =
    body.captain && typeof body.captain === "object"
      ? {
          name: strings((body.captain as { name?: unknown }).name),
          email: strings((body.captain as { email?: unknown }).email),
        }
      : undefined

  const contact =
    body.contact && typeof body.contact === "object"
      ? {
          name: strings((body.contact as { name?: unknown }).name),
          email: strings((body.contact as { email?: unknown }).email),
        }
      : undefined

  const division = strings(body.division) || undefined
  const teamName = strings(body.teamName) || undefined

  let addons: ("mulligan" | "drinkBand")[] | undefined
  if (Array.isArray(body.addons)) {
    addons = body.addons.filter(
      (a: unknown): a is "mulligan" | "drinkBand" =>
        a === "mulligan" || a === "drinkBand"
    )
  }

  try {
    const cart = await createCart({
      flow,
      quantity,
      donationPresetIndex,
      addons,
      golfers,
      captain,
      division,
      teamName,
      contact,
    })
    return NextResponse.json({ cartRef: cart.cartRef, cart })
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
