import { uuid } from "@sanity/uuid"
import { decode } from "html-entities"
import type { SanityClient } from "sanity"
import type { WP_REST_API_Page } from "wp-types"

import type { Page } from "@/sanity.types" // <-- Use your Page type here
import { htmlToBlockContent } from "./htmlToBlockContent"
import { serializedHtmlToBlockContent } from "./serializedHtmlToBlockContent"
import { sanityIdToImageReference } from "./sanityIdToImageReference"
import { sanityUploadFromUrl } from "./sanityUploadFromUrl"
import { wpImageFetch } from "./wpImageFetch"

// Remove these keys because they'll be created by Content Lake
type StagedPage = Omit<Page, "_createdAt" | "_updatedAt" | "_rev">

export async function transformToPage(
  wpDoc: WP_REST_API_Page,
  client: SanityClient,
  existingImages: Record<string, string> = {}
): Promise<StagedPage> {
  const doc: StagedPage = {
    _id: `page-${wpDoc.id}`,
    _type: "page",
  }

  doc.title = decode(wpDoc.title.rendered).trim()

  if (wpDoc.slug) {
    doc.slug = { _type: "slug", current: wpDoc.slug }
  }

  // Pages typically don't have categories or tags, but add if your schema supports them
  // if (Array.isArray(wpDoc.categories) && wpDoc.categories.length) {
  //   doc.categories = wpDoc.categories.map((catId) => ({
  //     _key: uuid(),
  //     _type: "reference",
  //     _ref: `category-${catId}`,
  //   }))
  // }

  // if (Array.isArray(wpDoc.tags) && wpDoc.tags.length) {
  //   doc.tags = wpDoc.tags.map((tagId) => ({
  //     _key: uuid(),
  //     _type: "reference",
  //     _ref: `tag-${tagId}`,
  //   }))
  // }

  // Author is optional for pages; add if your schema supports it
  // if (wpDoc.author) {
  //   doc.author = {
  //     _type: "reference",
  //     _ref: `author-${wpDoc.author}`,
  //   }
  // }

  if (wpDoc.date) {
    doc.date = wpDoc.date
  }

  if (wpDoc.modified) {
    doc.modified = wpDoc.modified
  }

  if (wpDoc.status) {
    doc.status = wpDoc.status as StagedPage["status"]
  }

  // Pages don't have sticky property
  // doc.sticky = wpDoc.sticky == true

  // Featured image
  if (typeof wpDoc.featured_media === "number" && wpDoc.featured_media > 0) {
    if (existingImages[wpDoc.featured_media]) {
      doc.featuredMedia = sanityIdToImageReference(
        existingImages[wpDoc.featured_media]
      )
    } else {
      const metadata = await wpImageFetch(wpDoc.featured_media)
      if (metadata?.source?.url) {
        const asset = await sanityUploadFromUrl(
          metadata.source.url,
          client,
          metadata
        )
        if (asset) {
          doc.featuredMedia = sanityIdToImageReference(asset._id)
          existingImages[wpDoc.featured_media] = asset._id
        }
      }
    }
  }

  if (wpDoc.content) {
    doc.content = wpDoc.content.raw
      ? await serializedHtmlToBlockContent(
          wpDoc.title.rendered,
          client,
          existingImages,
          wpDoc.content.raw
        )
      : undefined
  }

  return doc
}
