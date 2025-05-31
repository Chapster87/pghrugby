import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import "styles/globals.css"
import { Providers } from "./providers"

import { VisualEditing } from "next-sanity"
import { draftMode } from "next/headers"
import { DisableDraftMode } from "../components/DisableDraftMode"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="light">
      <body>
        <Providers>
          <main className="relative">{props.children}</main>
        </Providers>
        {(await draftMode()).isEnabled && (
          <>
            <VisualEditing />
            <DisableDraftMode />
          </>
        )}
      </body>
    </html>
  )
}
