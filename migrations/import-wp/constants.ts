export const BASE_URL = "https://pghrugby.com/wp-json/wp/v2"
export const PER_PAGE = 100

type WordPressDataType = "categories" | "posts" | "pages" | "tags" | "users"

// Define SanitySchemaType as a union of the possible schema type strings
type SanitySchemaType = "category" | "post" | "page" | "tag" | "author"

export const WP_TYPE_TO_SANITY_SCHEMA_TYPE: Record<
  WordPressDataType,
  SanitySchemaType
> = {
  categories: "category",
  posts: "post",
  pages: "page",
  tags: "tag",
  users: "author",
}
