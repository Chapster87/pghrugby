import type { Metadata, ResolvingMetadata } from "next"
import { notFound } from "next/navigation"
import { draftMode } from "next/headers"
import Image from "next/image"
import { client } from "../../../sanity/client"
import PortableText from "@/components/PortableText"
import { sanityFetch } from "@/sanity/lib/live"
import { pagesSlugs, pageQuery } from "./pages.query"
import { resolveOpenGraphImage } from "@/sanity/lib/utils"
import contentStyles from "@/styles/content.module.css"
import { PortableTextBlock } from "@portabletext/types"
import { extractPlainText, isPortableText } from "@/lib/util/portableTextUtils"

type Props = {
  params: Promise<{ slug: string }>
}

/**
 * Generate the static params for the page.
 * Always use published content here.
 */
export async function generateStaticParams() {
  const { data } = await sanityFetch({
    query: pagesSlugs,
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
    pageQuery,
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
  const ogImage = resolveOpenGraphImage(data?.coverImage)

  // Build canonical URL using current URL and slug
  const url = new URL((await parent).metadataBase || "https://pghrugby.com")
  url.pathname = `/${slug}`

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
    authors: data?.author?.name ? [{ name: data.author.name }] : [],
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
      authors: data?.author?.name ? [data.author.name] : [],
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

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: data.title,
    description: extractPlainText(data.excerpt) || "",
    image: data.featuredMedia?.asset?.url || "",
    datePublished: data.date || "",
    dateModified: data.modified || data.date || "",
    author: data.author?.name
      ? {
          "@type": "Person",
          name: data.author.name,
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
      "@id": `https://pghrugby.com/${data.slug}`,
    },
  }
}

export default async function Page(props: Props) {
  const { slug } = await props.params
  const { isEnabled } = await draftMode()

  const data = await client.fetch(
    pageQuery,
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
      className={`${contentStyles.contentMain} light 2xl:container px-4 py-6 mx-auto`}
    >
      {/* <div className="prose max-w-none"> */}
      {/* Structured data for SEO */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}

      {/* Featured image with proper alt text */}
      {data.featuredMedia?.asset?.url && (
        <div className="mb-6 relative aspect-video w-full">
          <Image
            src={data.featuredMedia.asset.url}
            alt={data.featuredMedia.alt || data.title || "Featured image"}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority
            className="object-cover rounded-lg"
          />
        </div>
      )}

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

          {data.author?.name && (
            <address className="not-italic">By: {data.author.name}</address>
          )}

          {data.status && (
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded text-xs">
              {data.status}
            </span>
          )}
        </div>
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
