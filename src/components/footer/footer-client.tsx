"use client"

import React from "react"
import Link from "@components/link"
import Heading from "../typography/heading"
import Skyline from "@svg/skyline/Skyline"
import clsx from "clsx"
import JoinForge from "./_components/join-forge"
import SocialLinks from "./_components/social-bar"
import FooterLinks from "./_components/footer-links"
import { FormattedNavData, SocialMedia } from "./types"
import s from "./style.module.css"

export default function FooterClient({
  sponsorBar,
  socialMedia,
  formattedNavData,
}: {
  sponsorBar?: React.ReactNode
  socialMedia?: SocialMedia
  formattedNavData?: FormattedNavData
}) {
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
      </footer>
    </>
  )
}
