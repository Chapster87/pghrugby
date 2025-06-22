import type { Metadata, ResolvingMetadata } from "next"
import { notFound } from "next/navigation"
import { draftMode } from "next/headers"
import { client } from "../../../../sanity/client"
import { type PortableTextBlock } from "next-sanity"

import CoverImage from "@/components/CoverImage"
import PortableText from "@/components/PortableText"
import { sanityFetch } from "@/sanity/lib/live"
import { postPagesSlugs, postQuery } from "./posts.query"
import { resolveOpenGraphImage } from "@/sanity/lib/utils"

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
  const previousImages = (await parent).openGraph?.images || []
  const ogImage = resolveOpenGraphImage(data?.coverImage)

  // Build canonical URL using current URL and slug
  const url = new URL((await parent).metadataBase || "https://pghrugby.com")
  url.pathname = `/${slug}`

  return {
    authors:
      data?.author?.firstName && data?.author?.lastName
        ? [{ name: `${data.author.firstName} ${data.author.lastName}` }]
        : [],
    title: `${data?.title} | Pittsburgh Forge Rugby Club`,
    description: data?.excerpt,
    alternates: {
      canonical: url.toString(),
    },
    openGraph: {
      images: ogImage ? [ogImage, ...previousImages] : previousImages,
    },
  } satisfies Metadata
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

  console.log("Post data:", data)

  return (
    <div className="2xl:container px-[12] prose dark:prose-invert">
      <h2>{data.title}</h2>
      <ul>
        <li>
          <strong>Slug:</strong> {data.slug}
        </li>
        <li>
          <strong>Date:</strong> {data.date}
        </li>
        <li>
          <strong>Modified:</strong> {data.modified}
        </li>
        <li>
          <strong>Status:</strong> {data.status}
        </li>
        <li>
          <strong>Content:</strong>
          {data.content?.length ? (
            <PortableText value={data.content as PortableTextBlock[]} />
          ) : (
            <span>None</span>
          )}
        </li>
        <li>
          <strong>Excerpt:</strong>
          {data.excerpt?.length ? (
            <PortableText value={data.excerpt as PortableTextBlock[]} />
          ) : (
            <span>None</span>
          )}
        </li>
        <li>
          <strong>Featured Media:</strong>
          {data.featuredMedia ? (
            <CoverImage image={data.featuredMedia} priority />
          ) : (
            <span>None</span>
          )}
        </li>
        <li>
          <strong>Sticky:</strong> {data.sticky ? "Yes" : "No"}
        </li>
        <li>
          <strong>Author:</strong>{" "}
          {data.author?._ref ||
            data.author?._id ||
            JSON.stringify(data.author) ||
            "None"}
        </li>
        <li>
          <strong>Categories:</strong>{" "}
          {Array.isArray(data.categories) && data.categories.length > 0
            ? data.categories
                .map((cat: any) => cat._ref || cat._id || JSON.stringify(cat))
                .join(", ")
            : "None"}
        </li>
        <li>
          <strong>Tags:</strong>{" "}
          {Array.isArray(data.tags) && data.tags.length > 0
            ? data.tags
                .map((tag: any) => tag._ref || tag._id || JSON.stringify(tag))
                .join(", ")
            : "None"}
        </li>
      </ul>
    </div>
  )
}
