import { Noto_Sans, Oswald } from "next/font/google"
import localFont from "next/font/local"

/**
 * Shared font loaders for the site. Loaded once here and imported by both the
 * `(core)` and `(checkout)` root layouts so every route tree has the same
 * @font-face rules and CSS variables.
 */
export const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
})

export const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

export const lemonMilk = localFont({
  src: [
    {
      path: "../styles/fonts/lemonmilklight-webfont.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../styles/fonts/lemonmilklightitalic-webfont.woff2",
      weight: "300",
      style: "italic",
    },
    {
      path: "../styles/fonts/lemonmilk-webfont.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../styles/fonts/lemonmilkitalic-webfont.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "../styles/fonts/lemonmilkbold-webfont.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../styles/fonts/lemonmilkbolditalic-webfont.woff2",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-lemon-milk",
  display: "swap",
})
