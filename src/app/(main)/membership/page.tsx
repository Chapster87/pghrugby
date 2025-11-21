import type { Metadata, ResolvingMetadata } from "next"
import { draftMode } from "next/headers"
import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"
import { fetchFromSanity } from "@/sanity/client"
import PageBuilder from "@/components/PageBuilder"
import { membershipQuery } from "./membership.query"
import TierTable from "./_components/tier-table"
import { parseSanityImageRef } from "@/sanity/lib/utils"
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
    membershipQuery,
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
    title: seo?.title
      ? `${seo.title} | Pittsburgh Forge Rugby Club`
      : "Club Membership | Pittsburgh Forge Rugby Club",
    description:
      seo.description ||
      "Club membership information for the Pittsburgh Forge Rugby Club.",
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
    name: seo?.title
      ? `${seo.title} | Pittsburgh Forge Rugby Club`
      : "Club Membership | Pittsburgh Forge Rugby Club",
    url: seo?.canonicalUrl || "https://pghrugby.com/",
    headline: seo?.title
      ? `${seo.title} | Pittsburgh Forge Rugby Club`
      : "Club Membership | Pittsburgh Forge Rugby Club",
    description:
      seo?.description ||
      "Club membership information for the Pittsburgh Forge Rugby Club.",
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
    membershipQuery,
    isEnabled
      ? {
          perspective: "previewDrafts",
          useCdn: false,
          stega: true,
        }
      : undefined
  )

  const structuredData = generateStructuredData(data?.seo || {})

  return (
    <div className={`${contentStyles.contentMain} ${s.membershipPage}`}>
      {/* Structured data for SEO */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      )}

      <h1 className={s.pageTitle}>{data?.title}</h1>

      {data?.pageBuilder && (
        <div className={s.pageBuilderContainer}>
          <PageBuilder data={data.pageBuilder} />
        </div>
      )}

      <div className={s.membershipDetails}>
        <h2>Membership Tiers</h2>
        <TierTable
          hostedBtnId={"L7AR7NVRAN8YJ"}
          tierName={"Diamond Club Membership"}
          annualDonation={"$250/month or $2,500/year"}
          benefits={[
            "Spotlight media feature",
            "Name engraved on NEW plaque at Ruggers Pub",
            "Complementary reserved seating for FOUR at Annual Awards Gala",
            "SC7s Field Naming Rights",
          ]}
          subscriptions={[
            { label: "Month : $250.00 USD - monthly", value: "Month" },
            { label: "Year : $2,500.00 USD - yearly", value: "Year" },
          ]}
        />
        <TierTable
          hostedBtnId={"GWYMGW3F6AH9C"}
          tierName={"Platinum Club Membership"}
          annualDonation={"$100/month or $1,000/year"}
          benefits={[
            "Spotlight media feature",
            "Golf Outing Signage Recognition",
            "Name engraved on plaque at Ruggers",
          ]}
          subscriptions={[
            { label: "Month : $100.00 USD - monthly", value: "Month" },
            { label: "Year : $1,000.00 USD - yearly", value: "Year" },
          ]}
        />
        <TierTable
          hostedBtnId={"7G6PKQ4VKZCAW"}
          tierName={"Gold Club Membership"}
          annualDonation={"$50/month or $500/year"}
          benefits={[
            "Newsletter recognition",
            "Complementary reserved seats for TWO at Annual Awards Gala",
          ]}
          subscriptions={[
            { label: "Month : $50.00 USD - monthly", value: "Month" },
            { label: "Year : $500.00 USD - yearly", value: "Year" },
          ]}
        />
        <TierTable
          hostedBtnId={"FE3GE9UXNR46E"}
          tierName={"Silver Club Membership"}
          annualDonation={"$25/month or $250/year"}
          benefits={["Newsletter recognition"]}
          subscriptions={[
            { label: "Month : $25.00 USD - monthly", value: "Month" },
            { label: "Year : $250.00 USD - yearly", value: "Year" },
          ]}
        />
        <TierTable
          hostedBtnId={"S3QE9J6LTWR3N"}
          tierName={"Bronze Club Membership"}
          annualDonation={"$15/month or $150/year"}
          benefits={["Newsletter recognition"]}
          subscriptions={[
            { label: "Month : $15.00 USD - monthly", value: "Month" },
            { label: "Year : $150.00 USD - yearly", value: "Year" },
          ]}
        />
      </div>
    </div>
  )
}
