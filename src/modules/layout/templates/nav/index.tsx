"use client"

import { Suspense, useEffect, useState } from "react"
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
} from "@heroui/react"
import Link from "next/link"
import { ThemeSwitcher } from "@/components/ThemeSwitcher"
import { HttpTypes } from "@medusajs/types"
import CartDropdown from "../../components/cart-dropdown"
import { ChevronDown, Menu, X } from "lucide-react"
import Crest from "@svg/Crest"
import s from "./style.module.css"

interface NavProps {
  siteTitle: string
  cart: HttpTypes.StoreCart | null
}

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

export default function Nav({ siteTitle, cart }: NavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Move useEffect here
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
    <Navbar
      className="mt-[50px]"
      height="72px"
      onMenuOpenChange={setIsMenuOpen}
      maxWidth="2xl"
      classNames={{
        base: "bg-primary",
        wrapper: `${s.header} header top-[-1px] px-[12]`,
        brand: `${s.siteLogo}`,
      }}
    >
      <NavbarContent className="px-0">
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "Close site menu" : "Open site menu"}
          className="sm:hidden"
          icon={isMenuOpen ? <X /> : <Menu />}
        />
        <NavbarBrand>
          <Link href="/" color="foreground" aria-label="View Homepage">
            <Crest className={s.crest} />
            <div className="sr-only">{siteTitle}</div>
          </Link>
        </NavbarBrand>
      </NavbarContent>
      <NavbarContent className="hidden sm:flex gap-2" justify="center">
        {MENU.map((item, index) =>
          item.submenu ? (
            <Dropdown key={`${item.id}-${index}`}>
              <NavbarItem>
                <DropdownTrigger>
                  <Button
                    disableRipple
                    disableAnimation
                    className="p-0 bg-transparent data-[hover=true]:bg-transparent"
                    endContent={<ChevronDown />}
                    size="lg"
                  >
                    {item.label}
                  </Button>
                </DropdownTrigger>
              </NavbarItem>
              <DropdownMenu
                aria-label={`${item.label} submenu`}
                itemClasses={{
                  base: "gap-2",
                }}
              >
                {item.submenu.map((sub, subIdx) => (
                  <DropdownItem key={subIdx}>
                    <Link href={sub.url} color="foreground">
                      {sub.label}
                    </Link>
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
          ) : (
            <NavbarItem key={`${item.id}-${index}`}>
              <Link href={item.url} color="foreground">
                {item.label}
              </Link>
            </NavbarItem>
          )
        )}
      </NavbarContent>
      <NavbarContent justify="end">
        <NavbarItem className="hidden lg:flex">
          <Link
            href="/account"
            color="foreground"
            data-testid="nav-account-link"
          >
            Account
          </Link>
        </NavbarItem>
        <NavbarItem>
          <Suspense
            fallback={
              <Link href="/cart" color="foreground" data-testid="nav-cart-link">
                Cart (0)
              </Link>
            }
          >
            <CartDropdown cart={cart} />
          </Suspense>
        </NavbarItem>
      </NavbarContent>
      <NavbarMenu>
        {MENU.map((item, index) => (
          <NavbarMenuItem key={`${item.id}-${index}`}>
            <Link
              className="w-full"
              color={
                index === 2
                  ? "primary"
                  : index === MENU.length - 1
                  ? "danger"
                  : "foreground"
              }
              href="#"
            >
              {item.label}
            </Link>
          </NavbarMenuItem>
        ))}
      </NavbarMenu>
      <div className="hidden sm:block">
        <ThemeSwitcher />
      </div>
    </Navbar>
  )
}
