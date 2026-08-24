import { NextResponse } from "next/server"

import { listOrders } from "@/lib/prototype-stripe/store"

/**
 * PROTOTYPE — debug endpoint. Dumps the in-memory orders so the webhook path
 * can be verified without hunting through logs.
 */
export async function GET() {
  return NextResponse.json({ orders: listOrders() })
}
