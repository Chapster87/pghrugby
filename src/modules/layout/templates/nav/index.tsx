"use client"

import { Suspense, useState } from "react"
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
  Link,
} from "@heroui/react"
import { HttpTypes } from "@medusajs/types"
import CartDropdown from "../../components/cart-dropdown"
import { Menu, X } from "lucide-react"

export const AcmeLogo = () => {
  return (
    <svg fill="none" height="36" viewBox="0 0 32 32" width="36">
      <path
        clipRule="evenodd"
        d="M17.6482 10.1305L15.8785 7.02583L7.02979 22.5499H10.5278L17.6482 10.1305ZM19.8798 14.0457L18.11 17.1983L19.394 19.4511H16.8453L15.1056 22.5499H24.7272L19.8798 14.0457Z"
        fill="currentColor"
        fillRule="evenodd"
      />
    </svg>
  )
}

interface NavProps {
  siteTitle: string
  cart: HttpTypes.StoreCart | null
}

export default function Nav({ siteTitle, cart }: NavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const menuItems = [
    "Profile",
    "Dashboard",
    "Activity",
    "Analytics",
    "System",
    "Deployments",
    "My Settings",
    "Team Settings",
    "Help & Feedback",
    "Log Out",
  ]

  return (
    <Navbar
      onMenuOpenChange={setIsMenuOpen}
      maxWidth="2xl"
      classNames={{ wrapper: "px-[12]" }}
    >
      <NavbarContent className="px-0">
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "Close site menu" : "Open site menu"}
          className="sm:hidden"
          icon={isMenuOpen ? <X /> : <Menu />}
        />
        <NavbarBrand>
          <Link href="/" color="foreground">
            {/* <AcmeLogo /> */}
            {siteTitle}
          </Link>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className="hidden sm:flex gap-4" justify="center">
        <NavbarItem>
          <Link href="/store" color="foreground">
            Store
          </Link>
        </NavbarItem>
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
        {menuItems.map((item, index) => (
          <NavbarMenuItem key={`${item}-${index}`}>
            <Link
              className="w-full"
              color={
                index === 2
                  ? "primary"
                  : index === menuItems.length - 1
                  ? "danger"
                  : "foreground"
              }
              href="#"
              size="lg"
            >
              {item}
            </Link>
          </NavbarMenuItem>
        ))}
      </NavbarMenu>
    </Navbar>
  )
}
