import type { Metadata, ResolvingMetadata } from "next"
import { notFound } from "next/navigation"
import { draftMode } from "next/headers"
import Image from "next/image"
import { client } from "../../../../sanity/client"
import { type PortableTextBlock } from "@portabletext/types"

import PortableText from "@/components/PortableText"
import CoverImage from "@/components/CoverImage"
import { sanityFetch } from "@/sanity/lib/live"
import { postPagesSlugs, postQuery } from "./posts.query"
import { resolveOpenGraphImage } from "@/sanity/lib/utils"
import contentStyles from "@/styles/content.module.css"
import { extractPlainText, isPortableText } from "@/lib/util/portableTextUtils"

/**
 * Generate the static params for the page.
 * Always use published content here.
 */
export async function generateStaticParams() {
  const { data } = await sanityFetch({
    query: postPagesSlugs,
    perspective: "published",
    stega: false,
  })
  return data
}

/**
 * Generate metadata for the page.
 */
export async function generateMetadata(
  props: { params: { slug: string } },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { isEnabled } = await draftMode()
  const { slug } = await props.params
  const data = await client.fetch(
    postQuery,
    { slug },
    {
      perspective: isEnabled ? "previewDrafts" : "published",
      stega: false,
    }
  )

  if (!data?._id) {
    return {}
  }

  const previousImages = (await parent).openGraph?.images || []
  const ogImage = resolveOpenGraphImage(data?.featuredMedia)

  // Build canonical URL using current URL and slug
  const url = new URL((await parent).metadataBase || "https://pghrugby.com")
  url.pathname = `/post/${slug}`

  // Format date for structured data if available
  const publishDate = data?.date ? new Date(data.date).toISOString() : undefined
  const modifiedDate = data?.modified
    ? new Date(data.modified).toISOString()
    : undefined

  return {
    title: data?.title
      ? `${data.title} | Pittsburgh Forge Rugby Club`
      : "Pittsburgh Forge Rugby Club",
    description:
      extractPlainText(data?.excerpt) ||
      "Pittsburgh Forge Rugby Club - Developing athletes and building community through the sport of rugby",
    authors:
      data?.author?.firstName && data?.author?.lastName
        ? [{ name: `${data.author.firstName} ${data.author.lastName}` }]
        : [],
    alternates: {
      canonical: url.toString(),
    },
    openGraph: {
      title: data?.title || "Pittsburgh Forge Rugby Club",
      description:
        extractPlainText(data?.excerpt) ||
        "Pittsburgh Forge Rugby Club - Rugby news, matches and community",
      type: "article",
      publishedTime: publishDate,
      modifiedTime: modifiedDate,
      authors:
        data?.author?.firstName && data?.author?.lastName
          ? [`${data.author.firstName} ${data.author.lastName}`]
          : [],
      images: ogImage ? [ogImage, ...previousImages] : previousImages,
      url: url.toString(),
    },
    twitter: {
      card: "summary_large_image",
      title: data?.title || "Pittsburgh Forge Rugby Club",
      description:
        extractPlainText(data?.excerpt) ||
        "Pittsburgh Forge Rugby Club - Rugby news, matches and community",
      images: ogImage ? [ogImage] : undefined,
    },
  } satisfies Metadata
}

// JSON-LD schema.org structured data
function generateStructuredData(data: any) {
  if (!data) return null

  // Get author name if available
  const authorName =
    data.author?.firstName && data.author?.lastName
      ? `${data.author.firstName} ${data.author.lastName}`
      : undefined

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: data.title,
    description: extractPlainText(data.excerpt) || "",
    image: data.featuredMedia?.asset?.url || "",
    datePublished: data.date || "",
    dateModified: data.modified || data.date || "",
    author: authorName
      ? {
          "@type": "Person",
          name: authorName,
        }
      : undefined,
    publisher: {
      "@type": "Organization",
      name: "Pittsburgh Forge Rugby Club",
      logo: {
        "@type": "ImageObject",
        url: "https://pghrugby.com/logo.png", // Update with actual logo URL
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://pghrugby.com/post/${data.slug}`,
    },
    keywords:
      Array.isArray(data.tags) && data.tags.length > 0
        ? data.tags
            .map((tag: any) => tag.title || tag._ref || "")
            .filter(Boolean)
        : [],
  }
}

export default async function PostPage(props: { params: { slug: string } }) {
  const { isEnabled } = await draftMode()
  const { slug } = await props.params
  const data = await client.fetch(
    postQuery,
    { slug },
    isEnabled
      ? {
          perspective: "previewDrafts",
          useCdn: false,
          stega: true,
        }
      : undefined
  )

  if (!data?._id) {
    return notFound()
  }

  const structuredData = generateStructuredData(data)

  return (
    <article
      className={`${contentStyles.contentMain} light 2xl:container px-4 py-6 mx-auto `}
    >
      {/* <div className="prose max-w-none"> */}
      {/* Structured data for SEO */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}

      {/* Featured image */}
      {/* {data.featuredMedia && (
          <div className="mb-6 relative aspect-video w-full">
            <CoverImage image={data.featuredMedia} priority />
          </div>
        )} */}

      <header className="mb-8">
        <h1>{data.title}</h1>

        {isPortableText(data.excerpt) && (
          <div className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-4">
            <PortableText value={data.excerpt} />
          </div>
        )}

        <div className="flex flex-wrap gap-2 text-sm text-gray-500 dark:text-gray-400">
          {data.date && (
            <time dateTime={new Date(data.date).toISOString()}>
              Published: {new Date(data.date).toLocaleDateString()}
            </time>
          )}

          {data.modified && data.date !== data.modified && (
            <time dateTime={new Date(data.modified).toISOString()}>
              Updated: {new Date(data.modified).toLocaleDateString()}
            </time>
          )}

          {data.author?.firstName && data.author?.lastName && (
            <address className="not-italic">
              By: {`${data.author.firstName} ${data.author.lastName}`}
            </address>
          )}

          {data.status && (
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded text-xs">
              {data.status}
            </span>
          )}

          {data.sticky && (
            <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900 rounded text-xs">
              Featured
            </span>
          )}
        </div>

        {/* Categories and Tags */}
        {Array.isArray(data.categories) && data.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Categories:
            </span>
            {data.categories.map((cat: any, index: number) => (
              <span
                key={index}
                className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded"
              >
                {cat.title || cat._ref || ""}
              </span>
            ))}
          </div>
        )}

        {Array.isArray(data.tags) && data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Tags:
            </span>
            {data.tags.map((tag: any, index: number) => (
              <span
                key={index}
                className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded"
              >
                {tag.title || tag._ref || ""}
              </span>
            ))}
          </div>
        )}
      </header>

      <div className="">
        {isPortableText(data.content) ? (
          <PortableText value={data.content} />
        ) : (
          <p>No content available.</p>
        )}
      </div>
      {/* </div> */}
    </article>
  )
}
