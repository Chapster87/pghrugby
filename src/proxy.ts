// <host>/src/proxy.ts — shell-owned, never part of the vendored core subtree.
// Scaffolded by the ForgeCMS vendor CLI from docs/HOST-RUNTIME.md.
import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"

const CMS_MOUNT_PATH = "/admin"

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isMounted = pathname === CMS_MOUNT_PATH || pathname.startsWith(`${CMS_MOUNT_PATH}/`)
  const isAdminUi =
    isMounted &&
    !pathname.startsWith(`${CMS_MOUNT_PATH}/auth`) &&
    !pathname.startsWith(`${CMS_MOUNT_PATH}/api`)

  let response = NextResponse.next({ request: { headers: request.headers } })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user && isAdminUi) {
    return NextResponse.redirect(new URL(`${CMS_MOUNT_PATH}/auth`, request.url))
  }
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
