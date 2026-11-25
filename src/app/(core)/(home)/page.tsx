import type { Metadata, ResolvingMetadata } from "next"
import { notFound } from "next/navigation"

import { CardSlider } from "@/components/content/card-slider"
import { toMetaImageUrl, toRichText } from "@/content/datocms/adapter"
import { toIsoDate } from "@/content/formatters/date"
import { toPlainText } from "@/content/formatters/plain-text"
import { sportsOrganizationStructuredData } from "@/content/formatters/structured-data"
import RenderContent from "@/content/render-content"
import { isDatocmsPreviewEnabled } from "@/lib/cms-preview"
import { executeQuery } from "@/lib/datocms/executeQuery"
import { getAllMatches } from "@/lib/forgecms/competition.query"
import { NewHomeContent } from "./_content"
import { homeQuery, latestContentQuery } from "./homepage.query"
import VideoBg from "./video-bg"

import contentStyles from "@/styles/content.module.css"
import s from "./style.module.css"

/**
 * Generate metadata for the page.
 */
export async function generateMetadata(
  parent: ResolvingMetadata
): Promise<Metadata> {
  const isPreviewEnabled = isDatocmsPreviewEnabled()

  const { homepage: page } = await executeQuery(homeQuery, {
    excludeInvalid: false,
    includeDrafts: isPreviewEnabled,
  })

  if (!page) {
    return {}
  }

  // Build canonical URL using current URL and slug
  const url = new URL((await parent).metadataBase || "https://pghrugby.com")
  url.pathname = `/`

  const imageUrl = toMetaImageUrl(page.metaImage)
  const description = page.metaDescription || toPlainText(page.wpexcerpt)

  const structuredData = sportsOrganizationStructuredData({
    title: page.title,
    metaTitle: page.metaTitle,
    metaDescription: page.metaDescription,
    excerpt: page.wpexcerpt,
    imageUrl,
    canonicalUrl: page.canonicalUrl,
    publishedAt: page.creationDate,
    updatedAt: page._updatedAt,
    authorName: page.author?.name,
    path: "/",
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

function formatContentSliderData(latestContent: any[]) {
  const formattedContent = latestContent.map((item) => {
    // const formattedExcerpt = item.wpexcerpt || generateExcerpt(item.content) || ""
    const formattedExcerpt = item.wpexcerpt || ""
    const truncatedExcerpt =
      formattedExcerpt.length > 175
        ? formattedExcerpt.slice(0, 175) + "[…]"
        : formattedExcerpt

    return {
      type: "post",
      title: item.title,
      slug: item.slug,
      date: item.creationDate || item._updatedAt,
      excerpt: truncatedExcerpt,
      featuredMedia: item.featuredImage,
    }
  })

  return {
    title: "Latest Content",
    items: formattedContent,
  }
}

export default async function Home() {
  const isPreviewEnabled = isDatocmsPreviewEnabled()

  const { homepage: page } = await executeQuery(homeQuery, {
    variables: {},
    excludeInvalid: false,
    includeDrafts: isPreviewEnabled,
  })

  if (!page) {
    notFound()
  }

  const { allArticles: latestArticles } = await executeQuery(
    latestContentQuery,
    {
      variables: {},
      excludeInvalid: false,
      includeDrafts: isPreviewEnabled,
    }
  )

  const matches = await getAllMatches().catch(() => [])

  const contentSliderData = formatContentSliderData(latestArticles || [])

  return (
    <>
      <div className={`${s.homepage}`}>
        {/* Background Video Component */}
        <VideoBg />

        <div className={`dark ${contentStyles.contentBlock} ${s.homepageHero}`}>
          <RenderContent content={toRichText(page.content)} />
        </div>

        <div className={`${contentStyles.siteContainer}`}>
          <div className={`${s.contentSlider}`}>
            <CardSlider data={contentSliderData} />
          </div>
        </div>
      </div>

      <NewHomeContent articles={latestArticles ?? []} matches={matches} />
    </>
  )
}
