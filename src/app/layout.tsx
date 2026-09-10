import { Metadata } from "next"

import { getBaseURL } from "@lib/util/env"
import { lemonMilk } from "@/lib/fonts"

import "@styles/globals.css"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

/**
 * Root layout — This is the only layout in the tree that emits <html>/<body>. The
 * (core), (checkout), and (plugin) route groups render below it as non-html
 * wrappers, and forgecms's mounted core at /admin nests under it too.
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
      <body>{children}</body>
    </html>
  )
}
