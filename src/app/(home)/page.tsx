import type { Metadata, ResolvingMetadata } from "next"
import { draftMode } from "next/headers"
import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"
import { fetchFromSanity } from "@/sanity/client"
import PageBuilder from "@/components/PageBuilder"
import { homepageQuery, latestContentQuery } from "./homepage-query"
import contentStyles from "@/styles/content.module.css"
import { parseSanityImageRef } from "@/sanity/lib/utils"
import { CardSlider } from "@/components/content/card-slider"
import generateExcerpt from "@/lib/util/generateExcerpt"
import VideoBg from "./video-bg"
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
      images: ogImageUrl ? [{ url: ogImageUrl }] : undefined,
    },
    twitter: {
      title: seo.twitterTitle || seo.title,
      description: seo.twitterDescription || seo.description,
      images: seo.twitterImage
        ? [{ url: seo.twitterImage }]
        : ogImageUrl
        ? [{ url: ogImageUrl }]
        : undefined,
    },
  } satisfies Metadata
}

// JSON-LD schema.org structured data
function generateStructuredData(seo: any) {
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
  return {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    sport: "Rugby",
    location: "Pittsburgh, PA",
    name: seo?.title || "Pittsburgh Forge Rugby Club",
    url: seo?.canonicalUrl || "https://pghrugby.com/",
    headline: seo?.title || "Pittsburgh Forge Rugby Club",
    description:
      seo?.description ||
      "Welcome to the Pittsburgh Forge Rugby Club, where we celebrate the spirit of rugby in the Steel City. Join us for matches, events, and community engagement.",
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
      "@id": seo?.canonicalUrl || `https://pghrugby.com/`,
    },
  }
}

function formatContentSliderData(latestContent: any[]) {
  console.log("Latest Content:", latestContent)

  const formattedContent = latestContent.map((item) => {
    console.log("Item:", item)

    const formattedExcerpt = item.excerpt || generateExcerpt(item.content) || ""
    const truncatedExcerpt =
      formattedExcerpt.length > 175
        ? formattedExcerpt.slice(0, 175) + "[…]"
        : formattedExcerpt

    return {
      type: item._type,
      title: item.title,
      slug: item.slug,
      date: item.date,
      excerpt: truncatedExcerpt,
      featuredMedia: item.featuredMedia,
    }
  })
  return {
    title: "Latest Content",
    items: formattedContent,
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

  if (!collections || !region) {
    return null
  }

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

  const latestContent = await fetchFromSanity(
    latestContentQuery,
    isEnabled
      ? {
          perspective: "previewDrafts",
          useCdn: false,
          stega: true,
        }
      : undefined
  )

  const contentSliderData = formatContentSliderData(latestContent || [])

  return (
    <div className={`${s.homepage}`}>
      {/* Background Video Component */}
      <VideoBg />

      {/* Structured data for SEO */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      )}

      <div className={`dark ${contentStyles.contentMain} ${s.homepageHero}`}>
        <PageBuilder data={data.pageBuilder} />
      </div>

      <div className={`${contentStyles.siteContainer}`}>
        <div className={`${s.contentSlider}`}>
          <CardSlider data={contentSliderData} />
        </div>
      </div>
    </div>
  )
}
