import type { Metadata, ResolvingMetadata } from "next"
import Image from "next/image"
import { notFound } from "next/navigation"
import { draftMode } from "next/headers"
import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"
import { executeQuery } from "@/lib/datocms/executeQuery"
import { StructuredText } from "react-datocms"
import { fetchFromSanity } from "@/sanity/client"
import PageBuilder from "@/components/PageBuilder"
import { homepageQuery, homeQuery, latestContentQuery } from "./homepage.query"
import { CloudinaryImage } from "@/types/datocms"
import { ResultOf, readFragment } from "@/lib/datocms/graphql"
import { getCloudinaryImageProps } from "@/utils/cloudinary"
import contentStyles from "@/styles/content.module.css"
import { CardSlider } from "@/components/content/card-slider"
import generateExcerpt from "@/lib/util/generateExcerpt"
import VideoBg from "./video-bg"
import { fileFieldFragment } from "@fragments/blocks"
import { StructuredArticleData } from "@/types/structured-data"
import s from "./style.module.css"

type PageContentBlocks = NonNullable<
  NonNullable<ResultOf<typeof homeQuery>["homepage"]>["content"]
>["blocks"][number]

type PageProps = {
  params: Promise<{ countryCode: string }>
}

/**
 * Generate metadata for the page.
 */
export async function generateMetadata(
  parent: ResolvingMetadata
): Promise<Metadata> {
  // Fetch metadata from Sanity
  const { isEnabled } = await draftMode()

  const { homepage: page } = await executeQuery(homeQuery, {
    excludeInvalid: false,
    includeDrafts: isEnabled,
  })

  if (!page) {
    return {}
  }

  // Build canonical URL using current URL and slug
  const url = new URL((await parent).metadataBase || "https://pghrugby.com")
  url.pathname = `/`

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
function generateStructuredData(page: any): StructuredArticleData {
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
    "@type": "SportsOrganization",
    sport: "Rugby",
    location: "Pittsburgh, PA",
    name: headline || "Pittsburgh Forge Rugby Club",
    url: page.canonicalUrl || "https://pghrugby.com/",
    headline,
    description,
    image: imageUrl,
    datePublished: publishDate,
    dateModified: modifiedDate,
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
      "@id": page.canonicalUrl || `https://pghrugby.com/`,
    },
  }
}

function formatContentSliderData(latestContent: any[]) {
  const formattedContent = latestContent.map((item) => {
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

export default async function Home({ params }: PageProps) {
  const { countryCode } = await params
  const region = await getRegion(countryCode)
  const { collections } = await listCollections({
    fields: "id, handle, title",
  })
  const { isEnabled: isDraftModeEnabled } = await draftMode()

  if (!collections || !region) {
    return null
  }

  const { homepage: page } = await executeQuery(homeQuery, {
    variables: {},
    excludeInvalid: false,
    includeDrafts: isDraftModeEnabled,
  })

  console.log("page", page)

  if (!page) {
    notFound()
  }

  const dataSanity = await fetchFromSanity(
    homepageQuery,
    isDraftModeEnabled
      ? {
          perspective: "previewDrafts",
          useCdn: false,
          stega: true,
        }
      : undefined
  )

  const latestContent = await fetchFromSanity(
    latestContentQuery,
    isDraftModeEnabled
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

      <div className={`dark ${contentStyles.contentBlock} ${s.homepageHero}`}>
        {/* <PageBuilder data={dataSanity.pageBuilder} /> */}
        {page.content && (
          <StructuredText
            data={page.content}
            renderBlock={({ record }) => {
              const typedRecord = record as PageContentBlocks
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
                      {typedRecord.assets.map((maskedAsset) => {
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

      <div className={`${contentStyles.siteContainer}`}>
        <div className={`${s.contentSlider}`}>
          <CardSlider data={contentSliderData} />
        </div>
      </div>
    </div>
  )
}
