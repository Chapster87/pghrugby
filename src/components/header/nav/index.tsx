"use client"
import * as NavigationMenu from "@radix-ui/react-navigation-menu"
import * as Dialog from "@radix-ui/react-dialog"
import Link from "next/link"
import { ChevronDown, Menu, X } from "lucide-react"
import s from "./style.module.css"
import { useEffect, useState } from "react"

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
    <NavigationMenu.Root className="hidden sm:flex gap-9 flex-1 justify-center">
      <NavigationMenu.List className={s.navList}>
        {navigation &&
          navigation.map((item, index) =>
            item.submenu && item.submenu.length > 0 ? (
              <NavigationMenu.Item
                key={`${item.label}-${index}`}
                className={s.navItem}
              >
                <NavigationMenu.Trigger
                  className={`${s.navLink} flex items-center gap-1 group`}
                >
                  {item.label}
                  <span className="transition-transform duration-200 ml-1 group-data-[state=open]:rotate-180">
                    <ChevronDown className="w-4 h-4" />
                  </span>
                </NavigationMenu.Trigger>
                <NavigationMenu.Content className={s.navContent}>
                  <ul className={s.subNavList}>
                    {item.submenu.map((sub, subIdx) => (
                      <li key={subIdx} className={s.navSubItem}>
                        <Link
                          href={cleanUrl(sub.route || sub.url)} // Ensure route is prioritized
                          className={s.navSubLink}
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
                  <Link
                    href={cleanUrl(item.route || item.url)} // Ensure route is prioritized
                    className={s.navLink}
                  >
                    {item.label}
                  </Link>
                </NavigationMenu.Link>
              </NavigationMenu.Item>
            )
          )}
      </NavigationMenu.List>
    </NavigationMenu.Root>
  )
}

export function MobileNav({ formattedNavData }: NavProps) {
  const { navigation } = formattedNavData
  const [isOpen, setIsOpen] = useState(false) // State to manage dialog open state

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
              navigation.map((item, index) =>
                item.submenu ? (
                  <li
                    key={`${item.label}-${index}`}
                    className={s.mobileNavItem}
                  >
                    <details>
                      <summary className={s.mobileNavSummary}>
                        {item.label}
                        <span>
                          <ChevronDown className="w-4 h-4" />
                        </span>
                      </summary>
                      <ul className={s.mobileNavSubList}>
                        {item.submenu.map((sub, subIdx) => (
                          <li key={subIdx}>
                            <Link
                              href={cleanUrl(sub.route || sub.url)} // Ensure route is prioritized
                              className={s.mobileNavLink}
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
                      href={cleanUrl(item.route || item.url)} // Ensure route is prioritized
                      className={s.mobileNavLink}
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              )}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
