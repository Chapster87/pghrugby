"use client"
import React from "react"

import { useTheme } from "next-themes"
import { Text } from "@medusajs/ui"
import Link from "@components/link"
import Image from "next/image"
import Heading from "../typography/heading"
import MedusaCTA from "@modules/layout/components/medusa-cta"
import Skyline from "@svg/skyline/Skyline"
import clsx from "clsx"
import JoinForge from "./_components/join-forge"
import SocialLinks from "./_components/social-bar"
import FooterLinks from "./_components/footer-links"
import { FormattedNavData, SocialMedia } from "./types"
import s from "./style.module.css"

export default function FooterClient({
  serverData,
  sponsorBar,
  socialMedia,
  formattedNavData,
}: {
  serverData?: any
  sponsorBar?: React.ReactNode
  socialMedia?: SocialMedia
  formattedNavData?: FormattedNavData
}) {
  const { collections, productCategories } = serverData || {}
  const { theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Always render with a default theme class on SSR, update after mount
  const footerClass = clsx(
    "relative border-t border-ui-border-base w-full",
    mounted ? (theme === "dark" ? "dark" : "light") : "dark"
  )

  return (
    <>
      {sponsorBar}
      <footer className={clsx(footerClass, s.footer)}>
        <Skyline className={s.skyline} />
        <div className={`2xl:container ${s.footerInner}`}>
          <JoinForge />
          <div className={s.footerLinks}>
            <SocialLinks socialMedia={socialMedia as SocialMedia} />
            <FooterLinks
              formattedNavData={formattedNavData as FormattedNavData}
            />
          </div>
        </div>
        <div className={`2xl:container ${s.footerInnerOLD}`}>
          <div className="flex flex-col gap-y-6 xsm:flex-row items-start justify-between py-40">
            <div>
              <Link
                href="/"
                className="txt-compact-xlarge-plus text-ui-fg-subtle hover:text-ui-fg-base uppercase"
              >
                Medusa Store
              </Link>
            </div>
            <div className="gap-10 md:gap-x-16 grid grid-cols-2 sm:grid-cols-3">
              {productCategories && productCategories?.length > 0 && (
                <div className="flex flex-col gap-y-2">
                  <span className="txt-small-plus txt-ui-fg-base">
                    Categories
                  </span>
                  <ul
                    className="grid grid-cols-1 gap-2"
                    data-testid="footer-categories"
                  >
                    {productCategories?.slice(0, 6).map((c: any) => {
                      if (c.parent_category) {
                        return
                      }

                      const children =
                        c.category_children?.map((child: any) => ({
                          name: child.name,
                          handle: child.handle,
                          id: child.id,
                        })) || null

                      return (
                        <li
                          className="flex flex-col gap-2 text-ui-fg-subtle txt-small"
                          key={c.id}
                        >
                          <Link
                            className={clsx(
                              "hover:text-ui-fg-base",
                              children && "txt-small-plus"
                            )}
                            href={`/categories/${c.handle}`}
                            data-testid="category-link"
                          >
                            {c.name}
                          </Link>
                          {children && (
                            <ul className="grid grid-cols-1 ml-3 gap-2">
                              {children &&
                                children.map((child: any) => (
                                  <li key={child.id}>
                                    <Link
                                      className="hover:text-ui-fg-base"
                                      href={`/categories/${child.handle}`}
                                      data-testid="category-link"
                                    >
                                      {child.name}
                                    </Link>
                                  </li>
                                ))}
                            </ul>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
              {collections && collections.length > 0 && (
                <div className="flex flex-col gap-y-2">
                  <span className="txt-small-plus txt-ui-fg-base">
                    Collections
                  </span>
                  <ul
                    className={clsx(
                      "grid grid-cols-1 gap-2 text-ui-fg-subtle txt-small",
                      {
                        "grid-cols-2": (collections?.length || 0) > 3,
                      }
                    )}
                  >
                    {collections?.slice(0, 6).map((c: any) => (
                      <li key={c.id}>
                        <Link
                          className="hover:text-ui-fg-base"
                          href={`/collections/${c.handle}`}
                        >
                          {c.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex flex-col gap-y-2">
                <span className="txt-small-plus txt-ui-fg-base">Medusa</span>
                <ul className="grid grid-cols-1 gap-y-2 text-ui-fg-subtle txt-small">
                  <li>
                    <a
                      href="https://github.com/medusajs"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-ui-fg-base"
                    >
                      GitHub
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://docs.medusajs.com"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-ui-fg-base"
                    >
                      Documentation
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://github.com/medusajs/nextjs-starter-medusa"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-ui-fg-base"
                    >
                      Source code
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="flex w-full mb-16 justify-between text-ui-fg-muted">
            <Text className="txt-compact-small">
              © {new Date().getFullYear()} Medusa Store. All rights reserved.
            </Text>
            <MedusaCTA />
          </div>
        </div>
      </footer>
    </>
  )
}
