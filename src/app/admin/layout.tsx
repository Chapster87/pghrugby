import Navigation from "./components/navigation"
import Header from "./components/header"
import BreakpointIndicator from "./components/breakpoint-indicator"
import { ToastContainer } from "./components/toast"

import s from "./styles.module.css"

// The mounted admin is session- and DB-gated and read per-request, so the whole
// /admin subtree must never be statically prerendered at build time. Forcing
// this segment dynamic keeps the admin (and its API route handlers) request-time
// both in the standalone template and in a vendored consumer mount.
export const dynamic = "force-dynamic"

/**
 * Core-owned admin-chrome layout, rendered at the mount root.
 *
 * Deliberately html-free: the surrounding `<html>`/fonts/global CSS is owned
 * by the shell (`(site)` + `(cms)` isolation layouts in the template, or a
 * consumer's own root layout). This keeps the core subtree self-contained and
 * vendorable without dragging a root layout along.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={s.site}>
      <BreakpointIndicator />
      <Navigation />
      <div className={s.primary}>
        <Header />
        <main className={s.content}>{children}</main>
      </div>
      <ToastContainer />
    </div>
  )
}
