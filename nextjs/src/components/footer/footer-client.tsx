"use client"

import React from "react"
import { Text } from "@medusajs/ui"
import Link from "@components/link"
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

  return (
    <>
      {sponsorBar}
      <footer className={clsx(s.footer)}>
        <Skyline className={s.skyline} />
        <div className={s.footerInner}>
          <JoinForge />
          <div className={s.footerLinks}>
            <SocialLinks socialMedia={socialMedia as SocialMedia} />
            <FooterLinks
              formattedNavData={formattedNavData as FormattedNavData}
            />
          </div>
        </div>
        <div className={s.footerInnerOLD}>
          <div className={s.footerBottomWrapper}>
            <div>
              <Link href="/" className={s.footerLinkLarge}>
                Medusa Store
              </Link>
            </div>
            <div className={s.footerLinkGroups}>
              {productCategories && productCategories?.length > 0 && (
                <div className={s.footerLinkGroup}>
                  <span className={s.footerLinkHeading}>Categories</span>
                  <ul
                    className={s.footerLinkList}
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
                        <li className={s.footerLinkListItem} key={c.id}>
                          <Link
                            className={clsx(
                              s.footerLink,
                              children && s.footerLinkLarge
                            )}
                            href={`/categories/${c.handle}`}
                            data-testid="category-link"
                          >
                            {c.name}
                          </Link>
                          {children && (
                            <ul className={s.footerLinkSubList}>
                              {children &&
                                children.map((child: any) => (
                                  <li key={child.id}>
                                    <Link
                                      className={s.footerLink}
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
                <div className={s.footerLinkGroup}>
                  <span className={s.footerLinkHeading}>Collections</span>
                  <ul
                    className={clsx(s.footerLinkList, {
                      [s.footerLinkListTwoCols]: (collections?.length || 0) > 3,
                    })}
                  >
                    {collections?.slice(0, 6).map((c: any) => (
                      <li key={c.id}>
                        <Link
                          className={s.footerLink}
                          href={`/collections/${c.handle}`}
                        >
                          {c.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className={s.footerLinkGroup}>
                <span className={s.footerLinkHeading}>Medusa</span>
                <ul className={s.footerLinkList}>
                  <li>
                    <a
                      href="https://github.com/medusajs"
                      target="_blank"
                      rel="noreferrer"
                      className={s.footerLink}
                    >
                      GitHub
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://docs.medusajs.com"
                      target="_blank"
                      rel="noreferrer"
                      className={s.footerLink}
                    >
                      Documentation
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://github.com/medusajs/nextjs-starter-medusa"
                      target="_blank"
                      rel="noreferrer"
                      className={s.footerLink}
                    >
                      Source code
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className={s.footerCopyright}>
            <Text className={s.txtCompactSmall}>
              © {new Date().getFullYear()} Medusa Store. All rights reserved.
            </Text>
            <MedusaCTA />
          </div>
        </div>
      </footer>
    </>
  )
}
