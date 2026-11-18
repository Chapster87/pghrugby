import type { StructuredArticleData } from "@/types/structured-data"

import { toIsoDate } from "./date"
import { toPlainText } from "./plain-text"

/** The site's canonical origin, used when a record has no canonical URL. */
const SITE_URL = "https://pghrugby.com"

/** The publisher named in every variant. */
const SITE_NAME = "Pittsburgh Forge Rugby Club"

/** The image every variant falls back to when the record has no meta image. */
const FALLBACK_IMAGE = `${SITE_URL}/logo.png`

/**
 * The record fields the JSON-LD variants read.
 *
 * Deliberately structural rather than CMS-shaped: a route passes its own record,
 * and the formatter names only the fields it uses.
 */
export type StructuredDataInput = {
  /** The record's title, without the site suffix. */
  title?: string | null
  /** An editor-supplied title that replaces the derived headline. */
  metaTitle?: string | null
  /** An editor-supplied description that replaces the excerpt. */
  metaDescription?: string | null
  /** The record's excerpt, as HTML. */
  excerpt?: string | null
  /** The record's meta image URL. */
  imageUrl?: string | null
  /** The record's canonical URL, when an editor set one. */
  canonicalUrl?: string | null
  /** When the record was first published. */
  publishedAt?: string | null
  /** When the record was last updated. */
  updatedAt?: string | null
  /** The author's display name, when the record has one. */
  authorName?: string | null
  /** The site-relative path used when there is no canonical URL. */
  path: string
}

/**
 * Derive the headline: the editor's meta title, else the title with the site
 * suffix, else nothing.
 *
 * @param input - The record fields.
 * @returns The headline.
 */
function headline(input: StructuredDataInput): string {
  return input.metaTitle || (input.title ? `${input.title} | ${SITE_NAME}` : "")
}

/**
 * Derive the page URL: the editor's canonical URL, else the site origin plus the
 * record's path.
 *
 * @param input - The record fields.
 * @returns The absolute URL.
 */
function pageUrl(input: StructuredDataInput): string {
  return input.canonicalUrl || `${SITE_URL}${input.path}`
}

/**
 * The fields every variant shares: identity, dates, publisher, and the page the
 * data describes.
 *
 * The three variants differ only in `@type` and their own type-specific fields,
 * so the scaffolding lives here once. They are genuinely different schema.org
 * types, not accidental copies.
 *
 * @param input - The record fields.
 * @returns The shared JSON-LD fields.
 */
function shared(input: StructuredDataInput) {
  const image = input.imageUrl || FALLBACK_IMAGE

  return {
    "@context": "https://schema.org" as const,
    headline: headline(input),
    description: input.metaDescription || toPlainText(input.excerpt),
    image,
    datePublished: toIsoDate(input.publishedAt),
    dateModified: toIsoDate(input.updatedAt),
    publisher: {
      "@type": "Organization" as const,
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject" as const,
        url: image,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage" as const,
      "@id": pageUrl(input),
    },
  }
}

/**
 * Derive the author, when the record has one.
 *
 * @param input - The record fields.
 * @returns The author, or undefined.
 */
function author(input: StructuredDataInput) {
  return input.authorName
    ? { "@type": "Person" as const, name: input.authorName }
    : undefined
}

/**
 * JSON-LD for a Page.
 *
 * @param input - The page's fields.
 * @returns The structured data.
 */
export function articleStructuredData(
  input: StructuredDataInput
): StructuredArticleData {
  return { ...shared(input), "@type": "Article", author: author(input) }
}

/**
 * JSON-LD for a Post.
 *
 * @param input - The post's fields.
 * @returns The structured data.
 */
export function blogPostingStructuredData(
  input: StructuredDataInput
): StructuredArticleData {
  return { ...shared(input), "@type": "BlogPosting", author: author(input) }
}

/**
 * JSON-LD for the homepage, describing the club itself.
 *
 * @param input - The homepage's fields.
 * @returns The structured data.
 */
export function sportsOrganizationStructuredData(
  input: StructuredDataInput
): StructuredArticleData {
  const name = headline(input)

  return {
    ...shared(input),
    "@type": "SportsOrganization",
    sport: "Rugby",
    location: "Pittsburgh, PA",
    name: name || SITE_NAME,
    url: pageUrl(input),
  }
}
