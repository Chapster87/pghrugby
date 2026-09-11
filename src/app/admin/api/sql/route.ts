import { NextRequest, NextResponse } from "next/server"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { createClient } from "../../utils/supabase-server"

/**
 * Handles POST requests to execute arbitrary SQL via RPC.
 * Used by admin schema tooling for migrations and direct table manipulation.
 *
 * exec_sql is a SECURITY DEFINER function scoped to service_role only (see
 * db/provision/core-substrate.sql). Running arbitrary SQL is the highest
 * privilege in the system, so this route is restricted to admin users and
 * always executes via the service-role client after that check. The CMS role
 * is read from public.users (authoritative), not from auth-token metadata.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()
    if (userData?.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admin only." },
        { status: 403 }
      )
    }

    const { sql } = await req.json()

    if (!sql) {
      return NextResponse.json(
        { error: "SQL statement is required." },
        { status: 400 }
      )
    }

    const systemClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data, error } = await systemClient.rpc("exec_sql", { sql })

    if (error) {
      console.error("Error executing SQL:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 200 })
  } catch (err: unknown) {
    console.error("Unexpected error in POST /api/sql:", err)
    return NextResponse.json(
      { error: (err as Error).message || "Internal Server Error" },
      { status: 500 }
    )
  }
}
