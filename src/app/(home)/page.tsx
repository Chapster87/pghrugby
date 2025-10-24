import type { Metadata, ResolvingMetadata } from "next"
import { draftMode } from "next/headers"

import FeaturedProducts from "@modules/home/components/featured-products"
import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"
import { fetchFromSanity } from "@/sanity/client"
import PageBuilder from "@/components/PageBuilder"
import { homepageQuery } from "./homepage-query"
import contentStyles from "@/styles/content.module.css"
import s from "./style.module.css"

/**
 * Generate metadata for the page.
 */
export async function generateMetadata(
  props: { params: { slug: string } },
  parent: ResolvingMetadata
): Promise<Metadata> {
  // Fetch metadata from Sanity
  const { isEnabled } = await draftMode()
  const data = await fetchFromSanity(
    homepageQuery,
    isEnabled
      ? {
          perspective: "previewDrafts",
          useCdn: false,
          stega: true,
        }
      : undefined
  )

  const seo = data?.seo || {}

  // Build canonical URL using current URL and slug
  const url = new URL((await parent).metadataBase || "https://pghrugby.com")

  return {
    title: seo.title || "Pittsburgh Forge Rugby Club",
    description:
      seo.description ||
      "Welcome to the Pittsburgh Forge Rugby Club, where we celebrate the spirit of rugby in the Steel City. Join us for matches, events, and community engagement.",
    alternates: {
      canonical: seo.canonicalUrl || url.toString(),
    },
    openGraph: {
      title: seo.ogTitle || seo.title,
      description: seo.ogDescription || seo.description,
      url: seo.ogUrl || url.toString(),
      images: seo.ogImage ? [{ url: seo.ogImage }] : undefined,
    },
    twitter: {
      title: seo.twitterTitle || seo.title,
      description: seo.twitterDescription || seo.description,
      images: seo.twitterImage
        ? [{ url: seo.twitterImage }]
        : seo.ogImage
        ? [{ url: seo.ogImage }]
        : undefined,
    },
  } satisfies Metadata
}

// JSON-LD schema.org structured data
function generateStructuredData(seo: any) {
  return {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    sport: "Rugby",
    location: "Pittsburgh, PA",
    name: seo.title || "Pittsburgh Forge Rugby Club",
    url: seo.canonicalUrl || "https://pghrugby.com/",
    headline: seo.title || "Pittsburgh Forge Rugby Club",
    description:
      seo.description ||
      "Welcome to the Pittsburgh Forge Rugby Club, where we celebrate the spirit of rugby in the Steel City. Join us for matches, events, and community engagement.",
    publisher: {
      "@type": "Organization",
      name: "Pittsburgh Forge Rugby Club",
      logo: {
        "@type": "ImageObject",
        url: seo.ogImage || "https://pghrugby.com/logo.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": seo.canonicalUrl || `https://pghrugby.com/`,
    },
  }
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params
  const { countryCode } = params
  const region = await getRegion(countryCode)
  const { collections } = await listCollections({
    fields: "id, handle, title",
  })
  const { isEnabled } = await draftMode()

  const data = await fetchFromSanity(
    homepageQuery,
    isEnabled
      ? {
          perspective: "previewDrafts",
          useCdn: false,
          stega: true,
        }
      : undefined
  )

  const structuredData = generateStructuredData(data.seo || {})

  if (!collections || !region) {
    return null
  }

  return (
    <div className={`${s.homepage}`}>
      <div className={`dark ${contentStyles.contentMain} ${s.homepageContent}`}>
        {/* Structured data for SEO */}
        {structuredData && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(structuredData),
            }}
          />
        )}

        <PageBuilder data={data.pageBuilder} />

        <ul className="flex flex-col gap-x-6">
          <FeaturedProducts collections={collections} region={region} />
        </ul>
      </div>
    </div>
  )
}
