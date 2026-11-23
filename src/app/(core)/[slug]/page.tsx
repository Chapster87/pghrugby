import type { Metadata, ResolvingMetadata } from "next"
import { notFound } from "next/navigation"

import ShareBar from "@/components/share-bar"
import Heading from "@/components/typography/heading"
import Text from "@/components/typography/text"
import { toMetaImageUrl, toRichText } from "@/content/datocms/adapter"
import { formatDate, toIsoDate } from "@/content/formatters/date"
import { toPlainText } from "@/content/formatters/plain-text"
import { articleStructuredData } from "@/content/formatters/structured-data"
import RenderContent from "@/content/render-content"
import SidebarLayout from "@/layouts/sidebar"
import { isDatocmsPreviewEnabled } from "@/lib/cms-preview"
import { executeQuery } from "@/lib/datocms/executeQuery"
import { pageSlugs, pageQuery } from "./pages.query"

import contentStyles from "@/styles/content.module.css"
import s from "./styles.module.css"

type PageProps = {
  params: Promise<{ slug: string }>
}

/**
 * Generate the static params for the page.
 * Always use published content here.
 */
export async function generateStaticParams() {
  const { allPages: data } = await executeQuery(pageSlugs, {
    includeDrafts: false,
  })

  return data
}

/**
 * Generate metadata for the page.
 */
export async function generateMetadata(
  props: { params: Promise<{ slug: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const isPreviewEnabled = isDatocmsPreviewEnabled()
  const { slug } = await props.params

  const { page } = await executeQuery(pageQuery, {
    variables: { slug },
    excludeInvalid: false,
    includeDrafts: isPreviewEnabled,
  })

  if (!page) {
    return {}
  }

  // Build canonical URL using current URL and slug
  const url = new URL((await parent).metadataBase || "https://pghrugby.com")
  url.pathname = `/${slug}`

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
    path: `/${slug}`,
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

export default async function Page({ params }: PageProps) {
  const { slug } = await params
  const isPreviewEnabled = isDatocmsPreviewEnabled()

  const { page } = await executeQuery(pageQuery, {
    variables: { slug },
    excludeInvalid: false,
    includeDrafts: isPreviewEnabled,
  })

  if (!page) {
    notFound()
  }

  const shareUrl = page?.canonicalUrl ?? `https://pghrugby.com/${slug}`
  const shareTitle = page?.metaTitle
    ? page.metaTitle
    : `${page?.title ?? ""} | Pittsburgh Forge Rugby Club`

  return (
    <SidebarLayout>
      <article className={`${contentStyles.contentBlock} ${s.pageContent}`}>
        <div className="prose">
          {/* Featured image with proper alt text */}
          {/* {(page.featuredImage as CloudinaryImage) && (
            <div className={s.featuredImageWrapper}>
              <Image
                src={(page.featuredImage as CloudinaryImage).secure_url}
                alt={page.title || "Featured image"}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                priority
                className={s.featuredImage}
              />
            </div>
          )} */}

          <header className={s.header}>
            <Heading level="h1">{page.title}</Heading>

            <div className={s.meta}>
              {page.creationDate && (
                <time dateTime={toIsoDate(page.creationDate)}>
                  <Text variant="span" size="sm">
                    Published: {formatDate(page.creationDate)}
                  </Text>
                </time>
              )}

              {page._updatedAt && page.creationDate && (
                <time dateTime={toIsoDate(page._updatedAt)}>
                  <Text variant="span" size="sm">
                    Updated: {formatDate(page._updatedAt)}
                  </Text>
                </time>
              )}

              {page.author?.name && (
                <address>
                  <Text variant="span" size="sm">
                    By: {page.author.name}
                  </Text>
                </address>
              )}
            </div>
          </header>

          <RenderContent content={toRichText(page.content)} />

          <ShareBar url={shareUrl} title={shareTitle} />
        </div>
      </article>
    </SidebarLayout>
  )
}
