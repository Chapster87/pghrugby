"use client"
import * as NavigationMenu from "@radix-ui/react-navigation-menu"
import * as Dialog from "@radix-ui/react-dialog"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import Link from "next/link"
import { ChevronDown, Menu, X } from "lucide-react"
import s from "./style.module.css"
import { useEffect, useState } from "react"
import clsx from "clsx"

import type { NavItem } from ".." // You may need to create or adjust this import

interface NavProps {
  formattedNavData: {
    navigation?: NavItem[]
  }
}

function cleanUrl(url: string): string {
  // Ensure the URL is not altered if it's a valid route
  if (url.startsWith("/")) {
    return url
  }
  return url.endsWith("#") ? url.slice(0, -1) : url
}

export function MainNav({ formattedNavData }: NavProps) {
  const { navigation } = formattedNavData

  return (
    <NavigationMenu.Root className={s.mainNavRoot}>
      <NavigationMenu.List className={s.navList}>
        {navigation &&
          navigation.map((item, index) => {
            const itemKey = `${item.label}-${index}`
            return item.submenu && item.submenu.length > 0 ? (
              <NavigationMenu.Item key={itemKey} className={s.navItem}>
                <NavigationMenu.Trigger
                  className={clsx(s.navLink, s.navTriggerContent)}
                >
                  {item.label}
                  <span className={s.navTriggerIcon}>
                    <ChevronDown className={s.navTriggerIcon} />
                  </span>
                </NavigationMenu.Trigger>
                <NavigationMenu.Content className={s.navContent}>
                  <ul className={s.subNavList}>
                    {item.submenu.map((sub, subIdx) => {
                      const subKey = `${sub.label}-${subIdx}`
                      return (
                        <li key={subKey} className={s.navSubItem}>
                          <Link
                            href={cleanUrl(sub.route || sub.url)}
                            className={s.navSubLink}
                          >
                            {sub.label}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </NavigationMenu.Content>
              </NavigationMenu.Item>
            ) : (
              <NavigationMenu.Item key={itemKey}>
                <NavigationMenu.Link asChild>
                  <Link
                    href={cleanUrl(item.route || item.url)}
                    className={s.navLink}
                  >
                    {item.label}
                  </Link>
                </NavigationMenu.Link>
              </NavigationMenu.Item>
            )
          })}
      </NavigationMenu.List>
    </NavigationMenu.Root>
  )
}

export function MobileNav({ formattedNavData }: NavProps) {
  const { navigation } = formattedNavData
  const [isOpen, setIsOpen] = useState(false) // State to manage dialog open state
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null)

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsOpen(false) // Close the dialog when resizing beyond tablet breakpoint
      }
    }

    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <div className={s.mobileNavHeader}>
        <Dialog.Trigger asChild>
          <button
            aria-label="Open site menu"
            className={s.mobileNavButton}
            onClick={() => setIsOpen(true)} // Open the dialog
          >
            <Menu />
          </button>
        </Dialog.Trigger>
      </div>
      <Dialog.Portal>
        <Dialog.Overlay className={s.mobileNavOverlay} />
        <Dialog.Content className={s.mobileNavContent}>
          <VisuallyHidden>
            <Dialog.Title>Navigation Menu</Dialog.Title>
          </VisuallyHidden>
          <div className={s.mobileNavHeader}>
            <Dialog.Close asChild>
              <button
                aria-label="Close site menu"
                className={s.mobileNavButton}
                onClick={() => setIsOpen(false)} // Close the dialog
              >
                <X />
              </button>
            </Dialog.Close>
          </div>
          <ul className={s.mobileNavList}>
            {navigation &&
              navigation.map((item, index) => {
                const itemKey = `${item.label}-${index}`
                const isSubmenuOpen = openSubmenu === itemKey

                return item.submenu && item.submenu.length > 0 ? (
                  <li key={itemKey} className={s.mobileNavItem}>
                    <button
                      className={s.mobileNavSummary}
                      onClick={() =>
                        setOpenSubmenu(isSubmenuOpen ? null : itemKey)
                      }
                    >
                      {item.label}
                      <span
                        className={clsx(s.mobileNavSummaryIcon, {
                          [s.mobileNavSummaryIconRotate]: isSubmenuOpen,
                        })}
                      >
                        <ChevronDown className={s.mobileNavSummaryIcon} />
                      </span>
                    </button>
                    {isSubmenuOpen && (
                      <ul className={s.mobileNavSubList}>
                        {item.submenu.map((sub, subIdx) => {
                          const subKey = `${sub.label}-${subIdx}`
                          return (
                            <li key={subKey}>
                              <Link
                                href={cleanUrl(sub.route || sub.url)}
                                className={s.mobileNavLink}
                                onClick={() => setIsOpen(false)}
                              >
                                {sub.label}
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </li>
                ) : (
                  <li key={itemKey}>
                    <Link
                      href={cleanUrl(item.route || item.url)}
                      className={s.mobileNavLink}
                      onClick={() => setIsOpen(false)}
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              })}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
