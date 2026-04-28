import { BASE_URL, PER_PAGE } from "../constants"
import type { WordPressDataType, WordPressDataTypeResponses } from "../types"

const username = process.env.WORDPRESS_APP_USERNAME
const password = process.env.WORDPRESS_APP_PASSWORD

export async function wpDataTypeFetch<T extends WordPressDataType>(
  type: T,
  page: number,
  edit: boolean = false
): Promise<WordPressDataTypeResponses[T]> {
  const wpApiUrl = new URL(`${BASE_URL}/${type}`)
  wpApiUrl.searchParams.set("page", page.toString())
  wpApiUrl.searchParams.set("per_page", PER_PAGE.toString())

  const headers = new Headers()

  if (edit) {
    // 'edit' context returns pre-processed content and other non-public fields
    wpApiUrl.searchParams.set("context", "edit")

    headers.set(
      "Authorization",
      "Basic " + Buffer.from(username + ":" + password).toString("base64")
    )
  }

  return fetch(wpApiUrl, { headers }).then((res) =>
    res.ok ? res.json() : null
  )
}
