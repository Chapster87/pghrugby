import { defineQuery } from "next-sanity"

export const sponsorQuery = defineQuery(
  `*[_type == "sponsorBar"] | order(publishedAt desc)[0] {
    title,
    items[] {
      sponsor-> {
        _id,
        sponsorName,
        sponsorLogo,
        url,
        nofollow,
        openInNewTab,
        width,
        height
      }
    }
  }`
)
