"use client"

import { Suspense, useState } from "react"
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
  Link,
} from "@heroui/react"
import { HttpTypes } from "@medusajs/types"
import CartDropdown from "../../components/cart-dropdown"
import { ChevronDown, Menu, X } from "lucide-react"

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

  return (
    <Navbar
      onMenuOpenChange={setIsMenuOpen}
      maxWidth="2xl"
      classNames={{ base: "bg-primary", wrapper: "px-[12]" }}
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
      <NavbarContent className="hidden sm:flex gap-2" justify="center">
        {menuItems.map((item, index) =>
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
        {menuItems.map((item, index) => (
          <NavbarMenuItem key={`${item.id}-${index}`}>
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
              {item.label}
            </Link>
          </NavbarMenuItem>
        ))}
      </NavbarMenu>
    </Navbar>
  )
}
