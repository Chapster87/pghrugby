import { defineQuery } from "next-sanity"
import { seoFragment } from "@fragments/seo-fragment"

export const productContentQuery = defineQuery(
  `*[_type == "product" && slug.current == $slug][0]{
    title,
    "slug": slug.current,
    description,
    specs[] {
      lang,
      title,
      content
    },
    addons {
      title,
      products[]-> {
        title,
        "slug": slug.current
      }
    },
    form-> {
      _id,
      title
    },
    ${seoFragment}
  }`
)
