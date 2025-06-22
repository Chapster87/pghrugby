import { defineQuery } from "next-sanity"

export const navQuery = defineQuery(
  `*[_type == "navigation"] | order(publishedAt desc)[0] {
    mainNav[] {
      item->{_id, title, slug},
      customLink,
      overrideTitle,
      openInNewTab,
      submenu[]{
        item->{_id, title, slug},
        customLink,
        overrideTitle,
        openInNewTab
      }
    },
    footerNav[] {
      item->{_id, title, slug},
      customLink,
      overrideTitle,
      openInNewTab,
      submenu[]{
        _type == "reference" => @->{_id, title, slug},
        _type == "object" => {
          item->{_id, title, slug},
          customLink,
          overrideTitle,
          openInNewTab
        }
      }
    }
  }`
)
