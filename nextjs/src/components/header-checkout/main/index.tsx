"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import Crest from "@svg/Crest"
import { ChevronLeft } from "lucide-react"
import s from "./style.module.css"

interface NavProps {
  title: string
  cart?: any
}

export default function HeaderMain({ title, cart }: NavProps) {
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
      <div
        className={`lg:container lg:mx-auto ${s.headerInner} px-[12] flex items-center justify-between`}
      >
        <Link href="/" aria-label="View Homepage" className={s.siteLogo}>
          <Crest className={s.crest} />
          <div className="sr-only">{title}</div>
        </Link>
        <div className={`flex items-center gap-4`}>
          <Link
            href="/cart"
            className={`${s.navLink}`}
            data-testid="back-to-cart-link"
          >
            <ChevronLeft className="mr-2" />
            Back to Cart
          </Link>
        </div>
      </div>
    </header>
  )
}
