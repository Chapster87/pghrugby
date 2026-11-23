import type { Metadata, ResolvingMetadata } from "next"

import { toMetaImageUrl, toRichText } from "@/content/datocms/adapter"
import { toIsoDate } from "@/content/formatters/date"
import { toPlainText } from "@/content/formatters/plain-text"
import { articleStructuredData } from "@/content/formatters/structured-data"
import RenderContent from "@/content/render-content"
import { isDatocmsPreviewEnabled } from "@/lib/cms-preview"
import { executeQuery } from "@/lib/datocms/executeQuery"
import TierTable from "./_components/tier-table"
import { membershipQuery } from "./membership.query"

import contentStyles from "@/styles/content.module.css"
import s from "./style.module.css"

/**
 * Generate metadata for the page.
 */
export async function generateMetadata(
  parent: ResolvingMetadata
): Promise<Metadata> {
  const isPreviewEnabled = isDatocmsPreviewEnabled()

  const { membership: page } = await executeQuery(membershipQuery, {
    variables: {},
    excludeInvalid: false,
    includeDrafts: isPreviewEnabled,
  })

  if (!page) {
    return {}
  }

  // Build canonical URL using current URL
  const url = new URL((await parent).metadataBase || "https://pghrugby.com")
  url.pathname = `/membership`

  const imageUrl = toMetaImageUrl(page.metaImage)
  const description = page.metaDescription || toPlainText(page.wpexcerpt)

  const structuredData = articleStructuredData({
    title: page.title,
    metaTitle: page.metaTitle,
    metaDescription: page.metaDescription,
    excerpt: page.wpexcerpt,
    imageUrl,
    canonicalUrl: page.canonicalUrl,
    publishedAt: page.creationDate,
    updatedAt: page._updatedAt,
    authorName: page.author?.name,
    path: "/membership",
  })

  return {
    title: page.metaTitle || `${page.title} | Pittsburgh Forge Rugby Club`,
    description: page.metaDescription || undefined,
    alternates: {
      canonical: page.canonicalUrl || url.toString(),
    },
    openGraph: {
      title: page.metaTitle || page.title || undefined,
      description: description || undefined,
      url: page.canonicalUrl || url.toString(),
      images: imageUrl ? [{ url: imageUrl }] : undefined,
      type: "article",
      publishedTime: toIsoDate(page.creationDate) || undefined,
      modifiedTime: toIsoDate(page._updatedAt) || undefined,
      authors: page.author?.name ? [page.author.name] : [],
    },
    twitter: {
      title: page.metaTitle || page.title || undefined,
      description: description || undefined,
      images: imageUrl ? [{ url: imageUrl }] : undefined,
    },
    other: {
      "application/ld+json": JSON.stringify(structuredData),
    },
  } satisfies Metadata
}

export default async function Membership() {
  const isPreviewEnabled = isDatocmsPreviewEnabled()

  const { membership: page } = await executeQuery(membershipQuery, {
    variables: {},
    excludeInvalid: false,
    includeDrafts: isPreviewEnabled,
  })

  if (!page) {
    return null
  }

  return (
    <div className={`${contentStyles.contentBlock} ${s.membershipPage}`}>
      <div className="prose">
        <h1 className={s.pageTitle}>{page.title}</h1>
        <RenderContent content={toRichText(page.content)} />
      </div>

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
