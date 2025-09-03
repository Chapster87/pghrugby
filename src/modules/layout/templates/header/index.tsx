import HeaderTop from "./top"
import HeaderMain from "./main"
import { MainNav, MobileNav } from "./nav"
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
  navigation: NavItem[]
}

export default async function Header() {
  const settings = await client.fetch(settingsQuery)
  const navigation = await client.fetch(navQuery)
  console.log(navigation)
  const cart = await retrieveCart().catch(() => null)
  const siteTitle = settings?.title || "Pittsburgh Rugby"
  const formattedNavData: FormattedNavData = {
    navigation:
      navigation?.mainNav?.map((menu: any): NavItem => {
        const isProduct = menu.item?._type === "product"
        const isPost = menu.item?._type === "post"
        return {
          label: menu.overrideTitle || menu.item?.title,
          url: menu.item?.slug?.current
            ? isProduct
              ? `/product/${menu.item.slug.current}`
              : isPost
              ? `/post/${menu.item.slug.current}`
              : `/${menu.item.slug.current}`
            : "#",
          openInNewTab: menu.openInNewTab || false,
          submenu:
            menu.submenu?.map((subItem: any): SubMenuItem => {
              const isSubProduct = subItem.item?._type === "product"
              const isSubPost = subItem.item?._type === "post"
              return {
                label: subItem.overrideTitle || subItem.item?.title,
                url: subItem.item?.slug?.current
                  ? isSubProduct
                    ? `/product/${subItem.item.slug.current}`
                    : isSubPost
                    ? `/post/${subItem.item.slug.current}`
                    : `/${subItem.item.slug.current}`
                  : "#",
                openInNewTab: subItem.openInNewTab || false,
              }
            }) || [],
        }
      }) || [],
  }

  return (
    <>
      <HeaderTop />
      <HeaderMain
        title={siteTitle}
        mainNav={<MainNav formattedNavData={formattedNavData} />}
        mobileNav={<MobileNav formattedNavData={formattedNavData} />}
        cart={cart}
      />
    </>
  )
}
