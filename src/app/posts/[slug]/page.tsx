import type { Metadata, ResolvingMetadata } from "next"
import { notFound } from "next/navigation"
import { type PortableTextBlock } from "next-sanity"

import CoverImage from "@/components/CoverImage"
import PortableText from "@/components/PortableText"
import { sanityFetch } from "@/sanity/lib/live"
import { postPagesSlugs, postQuery } from "./posts.query"
import { resolveOpenGraphImage } from "@/sanity/lib/utils"

type Props = {
  params: Promise<{ slug: string }>
}

/**
 * Generate the static params for the page.
 * Learn more: https://nextjs.org/docs/app/api-reference/functions/generate-static-params
 */
export async function generateStaticParams() {
  const { data } = await sanityFetch({
    query: postPagesSlugs,
    // Use the published perspective in generateStaticParams
    perspective: "published",
    stega: false,
  })
  return data
}

/**
 * Generate metadata for the page.
 * Learn more: https://nextjs.org/docs/app/api-reference/functions/generate-metadata#generatemetadata-function
 */
export async function generateMetadata(
  props: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const params = await props.params
  const { data: post } = await sanityFetch({
    query: postQuery,
    params,
    // Metadata should never contain stega
    stega: false,
  })
  const previousImages = (await parent).openGraph?.images || []
  const ogImage = resolveOpenGraphImage(post?.coverImage)

  return {
    authors:
      post?.author?.firstName && post?.author?.lastName
        ? [{ name: `${post.author.firstName} ${post.author.lastName}` }]
        : [],
    title: post?.title,
    description: post?.excerpt,
    openGraph: {
      images: ogImage ? [ogImage, ...previousImages] : previousImages,
    },
  } satisfies Metadata
}

export default async function PostPage(props: Props) {
  const params = await props.params
  const [{ data: post }] = await Promise.all([
    sanityFetch({ query: postQuery, params }),
  ])

  if (!post?._id) {
    return notFound()
  }

  console.log("Post data:", post)

  return (
    <div className="2xl:container px-[12] prose">
      <h2>{post.title}</h2>
      <ul>
        <li>
          <strong>Slug:</strong> {post.slug}
        </li>
        <li>
          <strong>Date:</strong> {post.date}
        </li>
        <li>
          <strong>Modified:</strong> {post.modified}
        </li>
        <li>
          <strong>Status:</strong> {post.status}
        </li>
        <li>
          <strong>Content:</strong>
          {post.content?.length ? (
            <PortableText value={post.content as PortableTextBlock[]} />
          ) : (
            <span>None</span>
          )}
        </li>
        <li>
          <strong>Excerpt:</strong>
          {post.excerpt?.length ? (
            <PortableText value={post.excerpt as PortableTextBlock[]} />
          ) : (
            <span>None</span>
          )}
        </li>
        <li>
          <strong>Featured Media:</strong>
          {post.featuredMedia ? (
            <CoverImage image={post.featuredMedia} priority />
          ) : (
            <span>None</span>
          )}
        </li>
        <li>
          <strong>Sticky:</strong> {post.sticky ? "Yes" : "No"}
        </li>
        <li>
          <strong>Author:</strong>{" "}
          {post.author?._ref ||
            post.author?._id ||
            JSON.stringify(post.author) ||
            "None"}
        </li>
        <li>
          <strong>Categories:</strong>{" "}
          {Array.isArray(post.categories) && post.categories.length > 0
            ? post.categories
                .map((cat: any) => cat._ref || cat._id || JSON.stringify(cat))
                .join(", ")
            : "None"}
        </li>
        <li>
          <strong>Tags:</strong>{" "}
          {Array.isArray(post.tags) && post.tags.length > 0
            ? post.tags
                .map((tag: any) => tag._ref || tag._id || JSON.stringify(tag))
                .join(", ")
            : "None"}
        </li>
      </ul>
    </div>
  )
}
