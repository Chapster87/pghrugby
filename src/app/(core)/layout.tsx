import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import { draftMode } from "next/headers"
import { VisualEditing } from "next-sanity"

import BreakpointIndicator from "@/components/breakpoint-indicator"
import Footer from "@/components/footer"
import Header from "@/components/header"
import { lemonMilk } from "@/lib/fonts"
import { SanityLive } from "@/sanity/lib/live"

import { DisableDraftMode } from "../../components/DisableDraftMode"
import { Providers } from "../providers"

import "@styles/globals.css"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default async function CoreLayout(props: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`light ${lemonMilk.variable}`}
      style={{ colorScheme: "light" }}
    >
      <body>
        <Providers>
          <BreakpointIndicator />
          <div className="siteMain">
            <Header />
            {props.children}
            <Footer />
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
