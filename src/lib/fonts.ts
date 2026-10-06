import localFont from "next/font/local"

/**
 * Shared font loaders for the site. Loaded once here and imported by the root
 * layout so every route tree has the same @font-face rules and CSS variables.
 *
 * Noto Sans and Oswald are self-hosted (latin-subset variable woff2) rather
 * than fetched from Google Fonts at build time. The Google fetch was a
 * nondeterministic build dependency: Google intermittently answers with an
 * extensionless `/l/font?kit=…` URL that Turbopack/Webpack cannot parse, which
 * failed `next build` (#139, upstream vercel/next.js#99114). Vendoring removes
 * the network fetch entirely.
 *
 * The `variable` names are the ones the stylesheets already consume
 * (`src/styles/globals.css`, `src/styles/components/typography.css`) via the
 * `:root` fallback stacks in `src/styles/variables.css`.
 */
export const notoSans = localFont({
  src: "../styles/fonts/notosans-latin.woff2",
  weight: "400 700",
  style: "normal",
  variable: "--font-noto-sans",
  display: "swap",
  fallback: ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
})

export const oswald = localFont({
  src: "../styles/fonts/oswald-latin.woff2",
  weight: "400 700",
  style: "normal",
  variable: "--font-oswald",
  display: "swap",
  fallback: ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
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
  fallback: ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
})
