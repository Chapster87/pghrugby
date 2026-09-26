"use client"

import { useEffect } from "react"

import { useCart } from "@/components/cart"
import Heading from "@/components/typography/heading"

import s from "./styles.module.css"

/**
 * `/cart` — the canonical URL that opens the minicart flyout.
 *
 * The flyout is the storefront's only cart surface
 * (`docs/agents/minicart-flyout-direction.md` § 7), so this route holds no
 * cart-building UI of its own: it opens the flyout on arrival and keeps a real
 * address for return pages and external links.
 */
export default function CartPage() {
  const { setOpen } = useCart()

  useEffect(() => {
    setOpen(true)
  }, [setOpen])

  return (
    <div className={s.cartPage}>
      <Heading level="h1">Cart</Heading>
      <p className={s.intro}>
        Your cart opens in the panel. Add tickets and registrations from any
        product page — they all land in the same cart.
      </p>
    </div>
  )
}
