"use server"

import { listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import FooterClient from "./footer-client"
import SponsorBar from "@components/sponsor-bar"
import { client } from "@/sanity/lib/client"
import { footerNavQuery } from "./footer.nav.query"
import { FormattedNavData, NavItem, SubMenuItem } from "./types"

const footerSocialsQuery = `*[_type == "socialMedia"] | order(publishedAt desc)[0] {
  facebook,
  instagram,
  twitter,
  youtube
}`

export default async function Footer() {
  const { collections } = await listCollections({
    fields: "*products",
  })
  const productCategories = await listCategories()
  const socials = await client.fetch(footerSocialsQuery)
  const navigation = await client.fetch(footerNavQuery)
  const formattedNavData: FormattedNavData = {
    navigation:
      navigation?.footerNav?.map((menu: any): NavItem => {
        const isProduct = menu.item?._type === "product"
        const isPost = menu.item?._type === "post"
        return {
          label: menu.overrideTitle || menu.item?.title,
          url:
            menu.route || // Prioritize route if defined
            (menu.item?.slug?.current
              ? isProduct
                ? `/product/${menu.item.slug.current}`
                : isPost
                ? `/post/${menu.item.slug.current}`
                : `/${menu.item.slug.current}`
              : "#"),
          route: menu.route || undefined, // Added route handling
          openInNewTab: menu.openInNewTab || false,
          submenu:
            menu.submenu?.map((subItem: any): SubMenuItem => {
              const isSubProduct = subItem.item?._type === "product"
              const isSubPost = subItem.item?._type === "post"
              return {
                label: subItem.overrideTitle || subItem.item?.title,
                url:
                  subItem.route || // Prioritize route if defined
                  (subItem.item?.slug?.current
                    ? isSubProduct
                      ? `/product/${subItem.item.slug.current}`
                      : isSubPost
                      ? `/post/${subItem.item.slug.current}`
                      : `/${subItem.item.slug.current}`
                    : "#"),
                route: subItem.route || undefined, // Added route handling
                openInNewTab: subItem.openInNewTab || false,
              }
            }) || [],
        }
      }) || [],
  }

  const serverData = {
    collections,
    productCategories,
  }

  return (
    <FooterClient
      serverData={serverData}
      sponsorBar={<SponsorBar />}
      socialMedia={socials}
      formattedNavData={formattedNavData}
    />
  )
}
