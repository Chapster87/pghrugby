"use client"

import { Suspense, useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import Link from "next/link"
import MiniCart from "@/components/mini-cart"
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

  // Determine if current page is home based on slug
  const pathname = usePathname()
  const isHome = pathname === "/"

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
    <header ref={headerRef} className={s.header} data-home={isHome}>
      <div className={s.headerInnerContainer}>
        <div key="mobile-nav">{mobileNav}</div>
        <Link href="/" aria-label="View Homepage" className={s.siteLogo}>
          <Crest className={s.crest} />
          <VisuallyHidden>{title}</VisuallyHidden>
        </Link>
        <div key="main-nav">{mainNav}</div>
        <div className={s.accountSection}>
          <Link
            href="/account"
            className={`${s.navLink} ${s.accountLinkHiddenLg}`}
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
            <MiniCart cart={cart} />
          </Suspense>
        </div>
      </div>
    </header>
  )
}
