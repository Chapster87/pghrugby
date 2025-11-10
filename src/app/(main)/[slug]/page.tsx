import type { Metadata, ResolvingMetadata } from "next"
import { notFound } from "next/navigation"
import { draftMode } from "next/headers"
import Image from "next/image"
import { client } from "../../../sanity/client"
import { parseSanityImageRef } from "@/sanity/lib/utils"
import PortableText from "@/components/PortableText"
import { sanityFetch } from "@/sanity/lib/live"
import { pagesSlugs, pageQuery } from "./pages.query"
import contentStyles from "@/styles/content.module.css"
import { isPortableText } from "@/lib/util/portableTextUtils"
import Sidebar from "@/components/sidebar"
import Example from "./(example)/page"
import ShareBar from "@/components/share-bar"

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

  const seo = data?.seo

  // Handle ogImage as either a string or Sanity image object
  let ogImageUrl: string | undefined = undefined
  if (seo?.ogImage) {
    if (
      typeof seo.ogImage === "object" &&
      seo.ogImage !== null &&
      "asset" in seo.ogImage
    ) {
      ogImageUrl = parseSanityImageRef(
        (seo.ogImage as { asset: { _ref: string } }).asset._ref
      )
    } else if (typeof seo.ogImage === "string") {
      ogImageUrl = seo.ogImage
    }
  }

  // Build canonical URL using current URL and slug
  const url = new URL((await parent).metadataBase || "https://pghrugby.com")
  url.pathname = `/${slug}`

  const publishDate = data?.date ? new Date(data.date).toISOString() : undefined
  const modifiedDate = data?.modified
    ? new Date(data.modified).toISOString()
    : undefined

  return {
    title: seo?.title
      ? `${seo?.title} | Pittsburgh Forge Rugby Club`
      : `${data?.title} | Pittsburgh Forge Rugby Club`,
    description: seo?.description,
    alternates: {
      canonical: seo?.canonicalUrl || url.toString(),
    },
    openGraph: {
      title: (seo?.ogTitle ?? undefined) || (seo?.title ?? undefined),
      description:
        (seo?.ogDescription ?? undefined) || (seo?.description ?? undefined),
      url: seo?.ogUrl || url.toString(),
      images: ogImageUrl ? [{ url: ogImageUrl }] : undefined,
      type: "article",
      publishedTime: publishDate,
      modifiedTime: modifiedDate,
      authors: data?.author?.name ? [data.author.name] : [],
    },
    twitter: {
      title: seo?.twitterTitle ?? seo?.title ?? data?.title ?? undefined,
      description:
        (seo?.twitterDescription ?? undefined) ||
        (seo?.description ?? undefined),
      images:
        typeof seo?.twitterImage === "string" && seo.twitterImage
          ? [{ url: seo.twitterImage }]
          : typeof ogImageUrl === "string" && ogImageUrl
          ? [{ url: ogImageUrl }]
          : undefined,
    },
  } satisfies Metadata
}

// JSON-LD schema.org structured data
function generateStructuredData(data: any) {
  if (!data) return null

  const { seo = {} } = data

  // Handle ogImage as either a string or Sanity image object
  let ogImageUrl: string = "https://pghrugby.com/logo.png"
  if (seo?.ogImage) {
    if (
      typeof seo.ogImage === "object" &&
      seo.ogImage !== null &&
      "asset" in seo.ogImage
    ) {
      ogImageUrl =
        parseSanityImageRef(
          (seo.ogImage as { asset: { _ref: string } }).asset._ref
        ) || ogImageUrl
    } else if (typeof seo.ogImage === "string") {
      ogImageUrl = seo.ogImage
    }
  }

  const publishDate = data?.date ? new Date(data.date).toISOString() : undefined
  const modifiedDate = data?.modified
    ? new Date(data.modified).toISOString()
    : undefined

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: seo?.title
      ? `${seo.title} | Pittsburgh Forge Rugby Club`
      : `${data?.title} | Pittsburgh Forge Rugby Club`,
    description: seo?.description || "",
    image: ogImageUrl,
    datePublished: publishDate || "",
    dateModified: modifiedDate || "",
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
        url: ogImageUrl,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": seo?.canonicalUrl || `https://pghrugby.com/${data.slug}`,
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

  console.log("Page data:", data)

  if (!data?._id) {
    return notFound()
  }

  const structuredData = generateStructuredData(data || {})

  const shareUrl = data.seo?.canonicalUrl || `https://pghrugby.com/${slug}`
  const shareTitle = data.seo?.title
    ? `${data.seo.title} | Pittsburgh Forge Rugby Club`
    : `${data?.title} | Pittsburgh Forge Rugby Club`

  if (slug === "example") {
    return <Example data={data} />
  }

  return (
    <div className={contentStyles.mainWithSidebar}>
      <article className={`${contentStyles.contentMain}`}>
        <div className="prose max-w-none">
          {/* Structured data for SEO */}
          {structuredData && (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify(structuredData),
              }}
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

            <p className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-4">
              {data.excerpt}
            </p>

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
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded-sm text-xs">
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

          <ShareBar url={shareUrl} title={shareTitle} />
        </div>
      </article>
      <Sidebar />
    </div>
  )
}
