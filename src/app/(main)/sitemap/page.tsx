import type { Metadata, ResolvingMetadata } from "next"
import Link from "next/link"

import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"
import { client } from "@/sanity/lib/client"

/**
 * Generate metadata for the page.
 */
export async function generateMetadata(
  props: { params: { slug: string } },
  parent: ResolvingMetadata
): Promise<Metadata> {
  // Build canonical URL using current URL and slug
  const url = new URL((await parent).metadataBase || "https://pghrugby.com")
  url.pathname = `/sitemap`

  return {
    title: "Sitemap | Pittsburgh Forge Rugby Club",
    description:
      "Welcome to the Pittsburgh Forge Rugby Club, where we celebrate the spirit of rugby in the Steel City. Join us for matches, events, and community engagement.",
    alternates: {
      canonical: url.toString(),
    },
    openGraph: {
      url: url.toString(),
    },
  } satisfies Metadata
}

const staticRoutes = [
  { href: "/", label: "Home" },
  { href: "/account", label: "Account" },
  { href: "/cart", label: "Cart" },
  { href: "/categories", label: "Categories" },
  { href: "/collections", label: "Collections" },
  // Add more static routes as needed
]

// Fetch all blog slugs from Sanity
async function getAllBlogPosts() {
  return client.fetch(
    `*[_type == "post" && defined(slug.current)]{
      "slug": slug.current,
      title
    } | order(_createdAt desc)`
  )
}

// Fetch all sanity pages with slugs
async function getAllSanityPages() {
  return client.fetch(
    `*[_type == "page" && defined(slug.current)]{
      "slug": slug.current,
      title
    } | order(_createdAt desc)`
  )
}

export default async function SiteMap(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params
  const { countryCode } = params
  const region = await getRegion(countryCode)
  const { collections } = await listCollections({
    fields: "id, handle, title",
  })
  const blogPosts = await getAllBlogPosts()
  const sanityPages = await getAllSanityPages()

  if (!collections || !region) {
    return null
  }

  return (
    <div className="py-12">
      <h1 className="text-2xl font-bold mb-4">Sitemap</h1>
      <ul className="space-y-2">
        {staticRoutes.map((route) => (
          <li key={route.href}>
            <Link href={route.href}>{route.label}</Link>
          </li>
        ))}
        <li>
          <span className="font-semibold">Collections:</span>
          <ul className="ml-4 list-disc">
            {collections.map((c: any) => (
              <li key={c.id}>
                <Link href={`/collections/${c.handle}`}>{c.title}</Link>
              </li>
            ))}
          </ul>
        </li>
        <li>
          <span className="font-semibold">Blog Posts:</span>
          <ul className="ml-4 list-disc">
            {blogPosts.map((post: any) => (
              <li key={post.slug}>
                <Link href={`/post/${post.slug}`}>
                  {post.title || post.slug}
                </Link>
              </li>
            ))}
          </ul>
        </li>
        <li>
          <span className="font-semibold">Pages:</span>
          <ul className="ml-4 list-disc">
            {sanityPages.map((page: any) => (
              <li key={page.slug}>
                <Link href={`/${page.slug}`}>{page.title || page.slug}</Link>
              </li>
            ))}
          </ul>
        </li>
      </ul>
    </div>
  )
}
