import { defineQuery } from "next-sanity"

export const pageQuery = defineQuery(
  `*[_type == "page" && slug.current == $slug][0]{
    _id,
    title,
    "slug": slug.current,
    date,
    modified,
    status,
    content,
    excerpt,
    coverImage,
    featuredMedia{
      asset->{
        url
      },
      alt
    },
    author->{name}
  }`
)

export const pagesSlugs = defineQuery(`
  *[_type == "page" && defined(slug.current)]
  {"slug": slug.current}
`)
