import { seoFragment } from "@fragments/seo-fragment"

export const membershipQuery = `
  *[_type == "membership"][0]{
    title,
    pageBuilder[] {
      ...,
      _type == "linkGroup" => {
        ...,
        links[] {
          _type,
          text,
          openInNewTab,
          customLink,
          route,
          asButton,
          style,
          reference-> {
            _id, title, slug, _type
          }
        }
      }
    },
    ${seoFragment}
  }
`
