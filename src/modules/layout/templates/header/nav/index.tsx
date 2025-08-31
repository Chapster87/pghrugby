"use client"

import { Suspense, useEffect, useState } from "react"
import * as NavigationMenu from "@radix-ui/react-navigation-menu"
import Link from "next/link"
import { HttpTypes } from "@medusajs/types"
import CartDropdown from "../../../components/cart-dropdown"
import { ChevronDown, Menu, X } from "lucide-react"
import Crest from "@svg/Crest"
import s from "./style.module.css"

import type { NavItem } from ".." // You may need to create or adjust this import

const MENU = [
  { id: "about", label: "About Us", url: "/about" },
  { id: "womens-rugby", label: "Women's Rugby", url: "/womens-rugby" },
  { id: "mens-rugby", label: "Men's Rugby", url: "/mens-rugby" },
  {
    id: "events",
    label: "Events",
    url: "/events",
    submenu: [
      { id: "store", label: "Store", url: "/store" },
      { id: "", label: "Upcoming Matches", url: "/events/upcoming" },
    ],
  },
  { id: "contact", label: "Contact Us", url: "/contact" },
  { id: "merchandise", label: "Merchandise", url: "/merchandise" },
]

interface NavProps {
  formattedNavData: {
    settings?: {
      siteTitle?: string
    }
    cart?: any
    navigation?: NavItem[]
  }
}

export default function Nav({ formattedNavData }: NavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const { settings, cart, navigation } = formattedNavData
  const siteTitle = settings?.siteTitle || "Pittsburgh Rugby"

  useEffect(() => {
    const header = document.querySelector(".header")
    if (!header) return

    const observer = new IntersectionObserver(
      ([e]) => e.target.classList.toggle(`${s.stuck}`, e.intersectionRatio < 1),
      { threshold: [1] }
    )

    observer.observe(header)

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <nav className={s.headerWrap}>
      <div
        className={`${s.header} header top-[-1px] px-[12] flex items-center justify-between`}
      >
        <Link href="/" aria-label="View Homepage" className={s.siteLogo}>
          <Crest className={s.crest} />
          <div className="sr-only">{siteTitle}</div>
        </Link>
        <NavigationMenu.Root className="hidden sm:flex gap-9 flex-1 justify-center">
          <NavigationMenu.List className="flex gap-6">
            {navigation &&
              navigation.map((item, index) =>
                item.submenu && item.submenu.length > 0 ? (
                  <NavigationMenu.Item
                    key={`${item.label}-${index}`}
                    className="relative"
                  >
                    <NavigationMenu.Trigger
                      className={s.navLink + " flex items-center gap-1 group"}
                    >
                      {item.label}
                      <span className="transition-transform duration-200 ml-1 group-data-[state=open]:rotate-180">
                        <ChevronDown className="w-4 h-4" />
                      </span>
                    </NavigationMenu.Trigger>
                    <NavigationMenu.Content className="absolute left-0 top-full bg-black shadow-lg rounded-md mt-2 z-10 min-w-[180px]">
                      <ul className="flex flex-col gap-2 p-2">
                        {item.submenu.map((sub, subIdx) => (
                          <li key={subIdx}>
                            <Link
                              href={sub.url}
                              className={
                                s.navLink +
                                " block w-full px-3 py-2 hover:bg-gray-100 rounded"
                              }
                            >
                              {sub.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </NavigationMenu.Content>
                  </NavigationMenu.Item>
                ) : (
                  <NavigationMenu.Item key={`${item.label}-${index}}`}>
                    <NavigationMenu.Link asChild>
                      <Link href={item.url} className={s.navLink}>
                        {item.label}
                      </Link>
                    </NavigationMenu.Link>
                  </NavigationMenu.Item>
                )
              )}
          </NavigationMenu.List>
        </NavigationMenu.Root>
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
      {/* Mobile menu toggle and menu */}
      <div className="sm:hidden flex items-center justify-between px-4 py-2">
        <button
          aria-label={isMenuOpen ? "Close site menu" : "Open site menu"}
          onClick={() => setIsMenuOpen((v) => !v)}
          className="p-2 rounded focus:outline-none"
        >
          {isMenuOpen ? <X /> : <Menu />}
        </button>
        <Link href="/" aria-label="View Homepage" className={s.siteLogo}>
          <Crest className={s.crest} />
        </Link>
      </div>
      {isMenuOpen && (
        <div className="sm:hidden bg-white shadow-lg px-4 py-4">
          <ul className="flex flex-col gap-4">
            {navigation &&
              navigation.map((item, index) =>
                item.submenu ? (
                  <li key={`${item.label}-${index}`} className="relative">
                    <details>
                      <summary
                        className={
                          s.navLink +
                          " flex items-center gap-1 cursor-pointer select-none group"
                        }
                      >
                        {item.label}
                        <span className="transition-transform duration-200 ml-1 group-open:rotate-180">
                          <ChevronDown className="w-4 h-4" />
                        </span>
                      </summary>
                      <ul className="flex flex-col gap-2 pl-4 mt-2">
                        {item.submenu.map((sub, subIdx) => (
                          <li key={subIdx}>
                            <Link
                              href={sub.url}
                              className={
                                s.navLink +
                                " block w-full px-3 py-2 hover:bg-gray-100 rounded"
                              }
                            >
                              {sub.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </li>
                ) : (
                  <li key={`${item.label}-${index}}`}>
                    <Link
                      href={item.url}
                      className={
                        s.navLink +
                        " block w-full px-3 py-2 hover:bg-gray-100 rounded"
                      }
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              )}
            <li>
              <Link
                href="/account"
                className={
                  s.navLink +
                  " block w-full px-3 py-2 hover:bg-gray-100 rounded"
                }
                data-testid="nav-account-link"
              >
                Account
              </Link>
            </li>
            <li>
              <Suspense
                fallback={
                  <Link
                    href="/cart"
                    className={
                      s.navLink +
                      " block w-full px-3 py-2 hover:bg-gray-100 rounded"
                    }
                    data-testid="nav-cart-link"
                  >
                    Cart (0)
                  </Link>
                }
              >
                <CartDropdown cart={cart} />
              </Suspense>
            </li>
          </ul>
        </div>
      )}
    </nav>
  )
}
