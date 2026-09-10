import { Metadata } from "next"

import { getBaseURL } from "@lib/util/env"
import { lemonMilk } from "@/lib/fonts"
import AdminRegistry from "@/cms/admin-registry"

import "@styles/globals.css"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

/**
 * Root layout — This is the only layout in the tree that emits <html>/<body>. The
 * (core), (checkout), and (plugin) route groups render below it as non-html
 * wrappers, and forgecms's mounted core at /admin nests under it too.
 *
 * `<AdminRegistry />` is the host seam stitch: it side-effect-registers site
 * field types (e.g. standings_table) into the empty core consumer registry.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`light ${lemonMilk.variable}`}
      style={{ colorScheme: "light" }}
    >
      <body>
        <AdminRegistry />
        {children}
      </body>
    </html>
  )
}
