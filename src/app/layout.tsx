import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import { Lato, Oswald } from "next/font/google"
import "@styles/globals.css"
import { Providers } from "./providers"

import BreakpointIndicator from "@components/BreakpointIndicator"
import SiteBackground from "@components/site-background"
import { VisualEditing } from "next-sanity"
import { draftMode } from "next/headers"
import { DisableDraftMode } from "../components/DisableDraftMode"
import { SanityLive } from "@/sanity/lib/live"

const lato = Lato({ subsets: ["latin"], weight: ["400"] })
const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${lato.className}`}>
      <body>
        <Providers>
          <div className="relative">
            <BreakpointIndicator />
            <SiteBackground />
            <div className="relative z-[1]">{props.children}</div>
          </div>
        </Providers>
        <SanityLive />
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
