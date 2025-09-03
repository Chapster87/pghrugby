"use client"

import { Suspense, useEffect, useRef } from "react"
import Link from "next/link"
import CartDropdown from "../../../components/cart-dropdown"
import Crest from "@svg/Crest"
import s from "./style.module.css"

interface NavProps {
  title: string
  mainNav: React.ReactNode
  mobileNav: React.ReactNode
  cart?: any
}

export default function HeaderMain({
  title,
  mainNav,
  mobileNav,
  cart,
}: NavProps) {
  const headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const header = headerRef.current
    if (!header) return

    const observer = new IntersectionObserver(
      ([e]) => {
        e.target.classList.toggle(`${s.stuck}`, !e.isIntersecting)
      },
      { rootMargin: "-1px 0px 0px 0px", threshold: [1] }
    )

    observer.observe(header)

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <header ref={headerRef} className={s.header}>
      <div
        className={`lg:container lg:mx-auto ${s.headerInner} px-[12] flex items-center justify-between`}
      >
        {mobileNav}
        <Link href="/" aria-label="View Homepage" className={s.siteLogo}>
          <Crest className={s.crest} />
          <div className="sr-only">{title}</div>
        </Link>
        {mainNav}
        <div className="flex items-center gap-4">
          <Link
            href="/account"
            className={s.navLink + " hidden lg:inline-block"}
            data-testid="nav-account-link"
          >
            Account
          </Link>
          <Suspense
            fallback={
              <Link
                href="/cart"
                className={s.navLink}
                data-testid="nav-cart-link"
              >
                Cart (0)
              </Link>
            }
          >
            <CartDropdown cart={cart} />
          </Suspense>
        </div>
      </div>
    </header>
  )
}
