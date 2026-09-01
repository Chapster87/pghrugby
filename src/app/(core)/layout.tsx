import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"

import BreakpointIndicator from "@/components/breakpoint-indicator"
import Footer from "@/components/footer"
import Header from "@/components/header"
import { lemonMilk } from "@/lib/fonts"

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
      </body>
    </html>
  )
}
