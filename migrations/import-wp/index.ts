import { createClient } from "@sanity/client"
import pLimit from "p-limit"
import { createOrReplace, defineMigration } from "sanity/migrate"
import type {
  WP_REST_API_Post,
  WP_REST_API_Page,
  WP_REST_API_Term,
  WP_REST_API_User,
} from "wp-types"

import { getDataTypes } from "./lib/getDataTypes"
import { sanityFetchImages } from "./lib/sanityFetchImages"
import { transformToPost } from "./lib/transformToPost"
import { transformToPage } from "./lib/transformToPage"
import { wpDataTypeFetch } from "./lib/wpDataTypeFetch"

const limit = pLimit(5)

// Add image imports, parallelized and limited
export default defineMigration({
  title: "Import WP JSON data",

  async *migrate(docs, context) {
    // Create a full client to handle image uploads
    const client = createClient(context.client.config())

    // Create an in-memory image cache to avoid re-uploading images
    const existingImages = await sanityFetchImages(client)

    const { wpType } = getDataTypes(process.argv)
    let page = 1
    let hasMore = true

    while (hasMore) {
      try {
        let wpData = await wpDataTypeFetch(wpType, page, true)

        if (Array.isArray(wpData) && wpData.length) {
          // Create an array of concurrency-limited promises to stage documents
          const docs = wpData.map((wpDoc) =>
            limit(async () => {
              if (wpType === "posts") {
                wpDoc = wpDoc as WP_REST_API_Post
                const doc = await transformToPost(wpDoc, client, existingImages)
                return doc
              } else if (wpType === "pages") {
                wpDoc = wpDoc as WP_REST_API_Page
                const doc = await transformToPage(wpDoc, client, existingImages)
                return doc
              } else if (wpType === "categories") {
                wpDoc = wpDoc as WP_REST_API_Term
              } else if (wpType === "tags") {
                wpDoc = wpDoc as WP_REST_API_Term
              } else if (wpType === "users") {
                wpDoc = wpDoc as WP_REST_API_User
                //   return {
                //     _id: `author-${wpDoc.id}`,
                //     _type: "author",
                //     name: wpDoc.name,
                //     slug: { _type: "slug", current: wpDoc.slug },
                //     email: wpDoc.email,
                //     description: wpDoc.description,
                //     url: wpDoc.url,
                //   }
              }

              hasMore = false
              throw new Error(`Unhandled WordPress type: ${wpType}`)
            })
          )

          // Resolve all documents concurrently, throttled by p-limit
          const resolvedDocs = await Promise.all(docs)

          yield resolvedDocs.map((doc) => createOrReplace(doc))
          page++
        } else {
          hasMore = false
        }
      } catch (error) {
        console.error(`Error fetching data for page ${page}:`, error)
        // Stop the loop in case of an error
        hasMore = false
      }
    }
  },
})
