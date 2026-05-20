import { listCartOptions, retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { getBaseURL } from "@lib/util/env"
import { StoreCartShippingOption } from "@medusajs/types"
import { Metadata } from "next"
import { Noto_Sans, Oswald } from "next/font/google"
import localFont from "next/font/local"
import { draftMode } from "next/headers"
import { VisualEditing } from "next-sanity"

import BreakpointIndicator from "@components/BreakpointIndicator"
import Footer from "@/components/footer"
import Header from "@/components/header"
import CartMismatchBanner from "@modules/layout/components/cart-mismatch-banner"
import FreeShippingPriceNudge from "@modules/shipping/components/free-shipping-price-nudge"
import { SanityLive } from "@/sanity/lib/live"

import { DisableDraftMode } from "../../components/DisableDraftMode"
import { Providers } from "../providers"

import "@styles/globals.css"

const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
})
const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

const lemonMilk = localFont({
  src: [
    {
      path: "../../styles/fonts/lemonmilklight-webfont.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../styles/fonts/lemonmilklightitalic-webfont.woff2",
      weight: "300",
      style: "italic",
    },
    {
      path: "../../styles/fonts/lemonmilk-webfont.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../styles/fonts/lemonmilkitalic-webfont.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../styles/fonts/lemonmilkbold-webfont.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../styles/fonts/lemonmilkbolditalic-webfont.woff2",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-lemon-milk",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default async function CoreLayout(props: { children: React.ReactNode }) {
  const customer = await retrieveCustomer()
  const cart = await retrieveCart()
  let shippingOptions: StoreCartShippingOption[] = []

  if (cart) {
    const { shipping_options } = await listCartOptions()

    shippingOptions = shipping_options
  }

  return (
    <html
      lang="en"
      className={`dark ${lemonMilk.variable}`}
      style={{ colorScheme: "dark" }}
    >
      <body>
        <Providers>
          <BreakpointIndicator />
          <div className="siteMain">
            <Header />
            {customer && cart && (
              <CartMismatchBanner customer={customer} cart={cart} />
            )}

            {cart && (
              <FreeShippingPriceNudge
                variant="popup"
                cart={cart}
                shippingOptions={shippingOptions}
              />
            )}
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
