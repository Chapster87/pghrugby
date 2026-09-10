import { Inter } from "next/font/google"
import Navigation from "./components/navigation"
import Header from "./components/header"
import BreakpointIndicator from "./components/breakpoint-indicator"
import { ToastContainer } from "./components/toast"

import "./styles/globals.css"
import s from "./styles.module.css"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

// The mounted admin is session- and DB-gated and read per-request, so the whole
// /admin subtree must never be statically prerendered at build time. Forcing
// this segment dynamic keeps the admin (and its API route handlers) request-time
// both in the standalone template and in a vendored consumer mount.
export const dynamic = "force-dynamic"

/**
 * Core-owned admin-chrome layout, rendered at the mount root.
 *
 * Deliberately html-free: the surrounding `<html>`/document shell is owned by
 * the host (or the standalone `(cms)` / `(site)` isolation layouts). This layout
 * owns core globals (tokens, typography, feather stroke rules) under
 * `[data-forgecms]` so install does not require the host to import core CSS
 * into the site root — and so host marketing tokens are not clobbered.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${s.site} ${inter.variable}`} data-forgecms>
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
