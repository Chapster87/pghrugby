import HeaderMain from "./main"
import { client } from "@/sanity/lib/client"
import { retrieveCart } from "@lib/data/cart"

const settingsQuery = `*[_type == "settings"] | order(publishedAt desc)[0] {
  title
}`

interface SubMenuItem {
  label: string
  url: string
  route?: string // Added route property
  openInNewTab: boolean
}

export interface NavItem extends SubMenuItem {
  submenu: SubMenuItem[]
}

export default async function Header() {
  const settings = await client.fetch(settingsQuery)
  const cart = await retrieveCart().catch(() => null)
  const siteTitle = settings?.title || "Pittsburgh Rugby"

  return <HeaderMain title={siteTitle} cart={cart} />
}
