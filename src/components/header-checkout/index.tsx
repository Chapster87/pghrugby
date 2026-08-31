import HeaderMain from "./main"
import { executeQuery } from "@/lib/forgecms/execute-query"
import { siteSettingsQuery } from "@/lib/forgecms/chrome.query"

export default async function Header() {
  const { siteSettings } = await executeQuery(siteSettingsQuery)
  const siteTitle = siteSettings?.defaultPageTitle || "Pittsburgh Rugby"

  return <HeaderMain title={siteTitle} />
}
