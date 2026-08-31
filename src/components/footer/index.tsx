"use server"

import FooterClient from "./footer-client"
import SponsorBar from "@components/sponsor-bar"
import { executeQuery } from "@/lib/forgecms/execute-query"
import {
  mapNavNodes,
  siteNavigationQuery,
  socialSettingsQuery,
} from "@/lib/forgecms/chrome.query"
import { SocialMedia } from "./types"

export default async function Footer() {
  const [{ site_navigation }, { socialSettings }] = await Promise.all([
    executeQuery(siteNavigationQuery),
    executeQuery(socialSettingsQuery),
  ])

  const socialMedia: SocialMedia = {
    facebook: socialSettings?.facebookUrl ?? "",
    instagram: socialSettings?.instagramUrl ?? "",
    twitter: socialSettings?.twitterUrl ?? "",
    youtube: socialSettings?.youtubeUrl ?? "",
  }
  const formattedNavData = {
    navigation: mapNavNodes(site_navigation?.footer),
  }

  return (
    <FooterClient
      sponsorBar={<SponsorBar />}
      socialMedia={socialMedia}
      formattedNavData={formattedNavData}
    />
  )
}
