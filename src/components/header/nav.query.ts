import { defineQuery } from "next-sanity"

export const navQuery = defineQuery(
  `*[_type == "navigation"] | order(publishedAt desc)[0] {
    mainNav[] {
      item->{_id, title, slug, _type},
      customLink,
      overrideTitle,
      openInNewTab,
      route,
      submenu[]{
        item->{_id, title, slug, _type},
        customLink,
        overrideTitle,
        openInNewTab,
        route
      }
    }
  }`
)
