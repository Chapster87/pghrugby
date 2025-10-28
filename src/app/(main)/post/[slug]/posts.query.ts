import { defineQuery } from "next-sanity"
import { seoFragment } from "@fragments/seo-fragment"

const postFields = /* groq */ `
  _id,
  "status": select(_originalId in path("drafts.**") => "draft", "published"),
  "title": coalesce(title, "Untitled"),
  "slug": slug.current,
  excerpt,
  coverImage,
  featuredMedia,
  sticky,
  categories[]->{title},
  tags[]->{title},
  "date": coalesce(date, _updatedAt),
  "modified": coalesce(date, _updatedAt),
  "author": author->{firstName, lastName, picture},
  ${seoFragment}
`

const linkReference = /* groq */ `
  _type == "link" => {
    "post": post->slug.current
  }
`

export const postQuery = defineQuery(`
  *[_type == "post" && slug.current == $slug] [0] {
    content[]{
    ...,
    markDefs[]{
      ...,
      ${linkReference}
    }
  },
    ${postFields}
  }
`)

export const postPagesSlugs = defineQuery(`
  *[_type == "post" && defined(slug.current)]
  {"slug": slug.current}
`)
