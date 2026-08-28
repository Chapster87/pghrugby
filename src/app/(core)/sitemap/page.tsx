import type { Metadata, ResolvingMetadata } from "next"
import Link from "next/link"

import { client } from "@/sanity/lib/client"

/**
 * Generate metadata for the page.
 */
export async function generateMetadata(
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
  { href: "/membership", label: "Membership" },
  { href: "/cart", label: "Build your order" },
  { href: "/calendar", label: "Event Calendar" },
  { href: "/contact", label: "Contact" },
  { href: "/links", label: "Links" },
  { href: "/matches", label: "Matches" },
  { href: "/mens-schedule", label: "Men's Schedule" },
  { href: "/womens-schedule", label: "Women's Schedule" },
  { href: "/mens-standings", label: "Men's Standings" },
  { href: "/womens-standings", label: "Women's Standings" },
  { href: "/styleguide", label: "Style Guide" },
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

export default async function SiteMap() {
  const blogPosts = await getAllBlogPosts()
  const sanityPages = await getAllSanityPages()

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
