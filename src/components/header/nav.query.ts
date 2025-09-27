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
    },
    footerNav[] {
      item->{_id, title, slug, _type},
      customLink,
      overrideTitle,
      openInNewTab,
      route,
      submenu[]{
        _type == "reference" => @->{_id, title, slug, _type},
        _type == "object" => {
          item->{_id, title, slug, _type},
          customLink,
          overrideTitle,
          openInNewTab,
          route
        }
      }
    }
  }`
)
