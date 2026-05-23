import type { Metadata, ResolvingMetadata } from "next"
import Image from "next/image"
import { draftMode } from "next/headers"
import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"
import { executeQuery } from "@/lib/datocms/executeQuery"
import { StructuredText } from "react-datocms"
import { membershipQuery } from "./membership.query"
import TierTable from "./_components/tier-table"
import { CloudinaryImage } from "@/types/datocms"
import { ResultOf, readFragment } from "@/lib/datocms/graphql"
import { getCloudinaryImageProps } from "@/utils/cloudinary"
import { fileFieldFragment } from "@fragments/blocks"
import { StructuredArticleData } from "@/types/structured-data"

import contentStyles from "@/styles/content.module.css"
import s from "./style.module.css"

type MembershipQueryResult = ResultOf<typeof membershipQuery>["membership"]

type MembershipContentBlocks = NonNullable<
  NonNullable<MembershipQueryResult>["content"]
>["blocks"][number]

/**
 * Generate metadata for the page.
 */
export async function generateMetadata(
  props: { params: { countryCode: string } | Promise<{ countryCode: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { isEnabled } = await draftMode()

  const { membership: page } = await executeQuery(membershipQuery, {
    variables: {},
    excludeInvalid: false,
    includeDrafts: isEnabled,
  })

  if (!page) {
    return {}
  }

  // Build canonical URL using current URL
  const url = new URL((await parent).metadataBase || "https://pghrugby.com")
  url.pathname = `/membership`

  const publishDate = page.creationDate
    ? new Date(page.creationDate).toISOString()
    : undefined
  const modifiedDate = page._updatedAt
    ? new Date(page._updatedAt).toISOString()
    : undefined

  const structuredData = generateStructuredData(page)

  return {
    title: page.metaTitle || `${page.title} | Pittsburgh Forge Rugby Club`,
    description: page.metaDescription || undefined,
    alternates: {
      canonical: page.canonicalUrl || url.toString(),
    },
    openGraph: {
      title: page.metaTitle || page.title || undefined,
      description: page.metaDescription || page.wpexcerpt || undefined,
      url: page.canonicalUrl || url.toString(),
      images:
        page.metaImage &&
        Array.isArray(page.metaImage) &&
        page.metaImage[0]?.url
          ? [{ url: page.metaImage[0].url }]
          : undefined,
      type: "article",
      publishedTime: publishDate,
      modifiedTime: modifiedDate,
      authors: page.author?.name ? [page.author.name] : [],
    },
    twitter: {
      title: page.metaTitle || page.title || undefined,
      description: page.metaDescription || page.wpexcerpt || undefined,
      images:
        page.metaImage &&
        Array.isArray(page.metaImage) &&
        page.metaImage[0]?.url
          ? [{ url: page.metaImage[0].url }]
          : undefined,
    },
    other: {
      "application/ld+json": JSON.stringify(structuredData),
    },
  } satisfies Metadata
}

// JSON-LD schema.org structured data
function generateStructuredData(
  page: NonNullable<MembershipQueryResult>
): StructuredArticleData {
  const imageUrl =
    (page.metaImage &&
      Array.isArray(page.metaImage) &&
      page.metaImage.length > 0 &&
      page.metaImage[0].url) ||
    "https://pghrugby.com/logo.png"

  const publishDate = page.creationDate
    ? new Date(page.creationDate).toISOString()
    : ""
  const modifiedDate = page._updatedAt
    ? new Date(page._updatedAt).toISOString()
    : ""

  const headline =
    page.metaTitle ||
    (page.title ? `${page.title} | Pittsburgh Forge Rugby Club` : "")
  const description =
    page.metaDescription ||
    (page.wpexcerpt ? page.wpexcerpt.replace(/<[^>]*>/g, "") : "")

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    image: imageUrl,
    datePublished: publishDate,
    dateModified: modifiedDate,
    author: page.author?.name
      ? {
          "@type": "Person",
          name: page.author.name,
        }
      : undefined,
    publisher: {
      "@type": "Organization",
      name: "Pittsburgh Forge Rugby Club",
      logo: {
        "@type": "ImageObject",
        url: imageUrl,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": page.canonicalUrl || `https://pghrugby.com/membership`,
    },
  }
}

export default async function Membership(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params
  const { countryCode } = params
  const region = await getRegion(countryCode)
  const { collections } = await listCollections({
    fields: "id, handle, title",
  })
  const { isEnabled: isDraftModeEnabled } = await draftMode()

  if (!collections || !region) {
    return null
  }

  const { membership: page } = await executeQuery(membershipQuery, {
    variables: {},
    excludeInvalid: false,
    includeDrafts: isDraftModeEnabled,
    baseEditingUrl: true,
  })

  if (!page) {
    return null
  }

  return (
    <div className={`${contentStyles.contentBlock} ${s.membershipPage}`}>
      <div className="prose">
        <h1 className={s.pageTitle}>{page.title}</h1>
        {page.content && (
          <StructuredText
            data={page.content}
            renderBlock={({ record }) => {
              const typedRecord = record as MembershipContentBlocks
              switch (typedRecord.__typename) {
                case "ExternalImageBlockRecord":
                  if (typedRecord.cloudinary) {
                    const image = typedRecord.cloudinary as CloudinaryImage
                    return (
                      <Image
                        src={image.secure_url}
                        alt={image.public_id}
                        width={image.width ?? undefined}
                        height={image.height ?? undefined}
                      />
                    )
                  } else if (typedRecord.url) {
                    const image = getCloudinaryImageProps(typedRecord.url)
                    return (
                      <Image
                        src={image.url}
                        alt=""
                        width={image.width ?? undefined}
                        height={image.height ?? undefined}
                      />
                    )
                  }

                  return null
                case "ImageBlockRecord":
                  if (typedRecord.asset) {
                    const asset = readFragment(
                      fileFieldFragment,
                      typedRecord.asset
                    )
                    return <Image src={asset.url} alt={asset.alt || ""} />
                  }
                  return null
                case "ImageGalleryBlockRecord":
                  return (
                    <div>
                      {typedRecord.assets.map((maskedAsset: any) => {
                        const asset = readFragment(
                          fileFieldFragment,
                          maskedAsset
                        )
                        return (
                          <Image
                            key={asset.id}
                            src={asset.url}
                            alt={asset.alt || ""}
                          />
                        )
                      })}
                    </div>
                  )
                case "VideoBlockRecord":
                  if (typedRecord.asset) {
                    const asset = readFragment(
                      fileFieldFragment,
                      typedRecord.asset
                    )
                    // For videos, you might want a video player component
                    // For now, returning a link to the video
                    return <video controls src={asset.url}></video>
                  }
                  return null
                default:
                  return null
              }
            }}
          />
        )}
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
