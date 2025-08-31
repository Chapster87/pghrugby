import HeaderTop from "./header-top"
import Nav from "./nav"
import { client } from "@/sanity/lib/client"
import { navQuery } from "./nav.query"
import { retrieveCart } from "@lib/data/cart"

const settingsQuery = `*[_type == "settings"] | order(publishedAt desc)[0] {
  title
}`

interface SubMenuItem {
  label: string
  url: string
  openInNewTab: boolean
}

export interface NavItem extends SubMenuItem {
  submenu: SubMenuItem[]
}

interface FormattedNavData {
  settings: any
  cart: any
  navigation: NavItem[]
}

export default async function Header() {
  const settings = await client.fetch(settingsQuery)
  const navigation = await client.fetch(navQuery)
  const cart = await retrieveCart().catch(() => null)

  const formattedNavData: FormattedNavData = {
    settings,
    cart,
    navigation:
      navigation?.mainNav?.map((menu: any): NavItem => {
        return {
          label: menu.overrideTitle || menu.item?.title,
          url: menu.item?.slug?.current ? `/${menu.item.slug.current}` : "#",
          openInNewTab: menu.openInNewTab || false,
          submenu:
            menu.submenu?.map(
              (subItem: any): SubMenuItem => ({
                label: subItem.overrideTitle || subItem.item?.title,
                url: subItem.item?.slug?.current
                  ? `/${subItem.item.slug.current}`
                  : "#",
                openInNewTab: subItem.openInNewTab || false,
              })
            ) || [],
        }
      }) || [],
  }

  return (
    <>
      <HeaderTop />
      <Nav formattedNavData={formattedNavData} />
    </>
  )
}
