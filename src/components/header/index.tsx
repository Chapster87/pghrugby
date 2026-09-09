import HeaderTop from "./top"
import HeaderMain from "./main"
import { MainNav, MobileNav } from "./nav"
import { executeQuery } from "@/lib/forgecms/execute-query"
import {
  mapNavNodes,
  siteNavigationQuery,
  siteSettingsQuery,
} from "@/lib/forgecms/chrome.query"

export interface SubMenuItem {
  label: string
  url: string
  route?: string // Added route property
  openInNewTab: boolean
}

export interface NavItem extends SubMenuItem {
  submenu: SubMenuItem[]
}

export default async function Header() {
  const [{ siteSettings }, { site_navigation }] = await Promise.all([
    executeQuery(siteSettingsQuery, { graceful: true }),
    executeQuery(siteNavigationQuery, { graceful: true }),
  ])
  const siteTitle = siteSettings?.defaultPageTitle || "Pittsburgh Rugby"
  const formattedNavData = {
    navigation: mapNavNodes(site_navigation?.header),
  }

  return (
    <>
      <HeaderTop />
      <HeaderMain
        title={siteTitle}
        mainNav={<MainNav formattedNavData={formattedNavData} />}
        mobileNav={<MobileNav formattedNavData={formattedNavData} />}
      />
    </>
  )
}
