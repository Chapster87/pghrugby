import type { Metadata } from "next"
import { Inter } from "next/font/google"
import AdminFrame from "./components/admin-frame"
import { ToastContainer } from "./components/toast"

import "./styles/globals.css"

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
 * Keep the mounted admin out of search indexes.
 *
 * Metadata merges into whatever document head the host owns, so this travels
 * with the subtree and needs no host SEO config. A host's `robots.txt` Disallow
 * only reduces crawl load — this directive is what guarantees de-indexing. The
 * public site's own indexing switch lives in `globals.site_settings.noIndex`;
 * the admin is always noindex and is deliberately not configurable.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

/**
 * Core-owned admin-chrome layout, rendered at the mount root.
 *
 * Deliberately html-free: the surrounding `<html>`/document shell is owned by
 * the host (or the standalone `(cms)` / `(site)` isolation layouts). This layout
 * owns core globals (tokens, typography, feather stroke rules) under
 * `[data-forgecms]` so install does not require the host to import core CSS
 * into the site root — and so host marketing tokens are not clobbered.
 *
 * Chrome (nav/header) is applied by `AdminFrame` for non-auth routes only.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={inter.variable} data-forgecms>
      <AdminFrame>{children}</AdminFrame>
      <ToastContainer />
    </div>
  )
}
