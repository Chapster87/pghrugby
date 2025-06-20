import type { Metadata, ResolvingMetadata } from "next"
import { notFound } from "next/navigation"
import { draftMode } from "next/headers"
import { client } from "../../../sanity/client"
import PortableText from "@/components/PortableText"
import { sanityFetch } from "@/sanity/lib/live"
import { pagesSlugs, pageQuery } from "./pages.query"
import { resolveOpenGraphImage } from "@/sanity/lib/utils"

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
    title: data?.title,
    description: data?.excerpt,
    alternates: {
      canonical: url.toString(),
    },
    openGraph: {
      images: ogImage ? [ogImage, ...previousImages] : previousImages,
      url: url.toString(),
    },
  } satisfies Metadata
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

  console.log("Page data:", data)

  return (
    <div className="2xl:container px-[12] prose">
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
            <PortableText value={data.content} />
          ) : (
            <span>None</span>
          )}
        </li>
        <li>
          <strong>Excerpt:</strong>
          {data.excerpt?.length ? (
            <PortableText value={data.excerpt} />
          ) : (
            <span>None</span>
          )}
        </li>
        <li>
          <strong>Featured Media:</strong>
          {data.featuredMedia?.asset?.url ? (
            <img
              src={data.featuredMedia.asset.url}
              alt={data.featuredMedia.alt || data.title}
              style={{ maxWidth: "400px" }}
            />
          ) : (
            <span>None</span>
          )}
        </li>
        <li>
          <strong>Author:</strong> {data.author?.name || "None"}
        </li>
      </ul>
    </div>
  )
}
