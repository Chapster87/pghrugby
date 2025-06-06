import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import "styles/globals.css"
import { Providers } from "./providers"

import BreakpointIndicator from "@components/BreakpointIndicator"
import SiteBackground from "@components/site-background"
import { VisualEditing } from "next-sanity"
import { draftMode } from "next/headers"
import { DisableDraftMode } from "../components/DisableDraftMode"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <main className="relative light text-foreground bg-background">
            <BreakpointIndicator />
            <SiteBackground />
            <div className="relative z-[1]">{props.children}</div>
          </main>
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
