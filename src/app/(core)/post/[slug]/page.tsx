import type { Metadata, ResolvingMetadata } from "next"
import { notFound } from "next/navigation"

import ShareBar from "@/components/share-bar"
import Heading from "@/components/typography/heading"
import Text from "@/components/typography/text"
import { toMetaImageUrl, toRichText } from "@/content/datocms/adapter"
import { formatDate, toIsoDate } from "@/content/formatters/date"
import { toPlainText } from "@/content/formatters/plain-text"
import { blogPostingStructuredData } from "@/content/formatters/structured-data"
import RenderContent from "@/content/render-content"
import SidebarLayout from "@/layouts/sidebar"
import { isDatocmsPreviewEnabled } from "@/lib/cms-preview"
import { executeQuery } from "@/lib/datocms/executeQuery"
import { postSlugs, postQuery } from "./posts.query"

import contentStyles from "@/styles/content.module.css"
import s from "./styles.module.css"

type PostProps = {
  params: Promise<{ slug: string }>
}

/**
 * Generate the static params for the page.
 * Always use published content here.
 */
export async function generateStaticParams() {
  const { allArticles: data } = await executeQuery(postSlugs, {
    includeDrafts: false,
  })

  return data
}

/**
 * Generate metadata for the page.
 */
export async function generateMetadata(
  props: PostProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const isPreviewEnabled = isDatocmsPreviewEnabled()
  const { slug } = await props.params

  const { article } = await executeQuery(postQuery, {
    variables: { slug },
    excludeInvalid: false,
    includeDrafts: isPreviewEnabled,
  })

  if (!article) {
    return {}
  }

  // Build canonical URL using current URL and slug
  const url = new URL((await parent).metadataBase || "https://pghrugby.com")
  url.pathname = `/post/${slug}`

  const imageUrl = toMetaImageUrl(article.metaImage)
  const description = article.metaDescription || toPlainText(article.wpexcerpt)

  const structuredData = blogPostingStructuredData({
    title: article.title,
    metaTitle: article.metaTitle,
    metaDescription: article.metaDescription,
    excerpt: article.wpexcerpt,
    imageUrl,
    canonicalUrl: article.canonicalUrl,
    publishedAt: article.creationDate,
    updatedAt: article._updatedAt,
    authorName: article.author?.name,
    path: `/post/${slug}`,
  })

  return {
    title:
      article.metaTitle ||
      `${article.title || ""} | Pittsburgh Forge Rugby Club`,
    description: article.metaDescription || undefined,
    alternates: {
      canonical: article.canonicalUrl || url.toString(),
    },
    openGraph: {
      title: article.metaTitle || article.title || undefined,
      description: description || undefined,
      url: article.canonicalUrl || url.toString(),
      images: imageUrl ? [{ url: imageUrl }] : undefined,
      type: "article",
      publishedTime: toIsoDate(article.creationDate) || undefined,
      modifiedTime: toIsoDate(article._updatedAt) || undefined,
      authors: article.author?.name ? [article.author.name] : [],
    },
    twitter: {
      title: article.metaTitle || article.title || undefined,
      description: description || undefined,
      images: imageUrl ? [{ url: imageUrl }] : undefined,
    },
    other: {
      "application/ld+json": JSON.stringify(structuredData),
    },
  } satisfies Metadata
}

export default async function PostPage({ params }: PostProps) {
  const { slug } = await params
  const isPreviewEnabled = isDatocmsPreviewEnabled()

  const { article } = await executeQuery(postQuery, {
    variables: { slug },
    excludeInvalid: false,
    includeDrafts: isPreviewEnabled,
  })

  if (!article) {
    notFound()
  }

  const shareUrl = article.canonicalUrl || `https://pghrugby.com/post/${slug}`
  const shareTitle = article.metaTitle
    ? article.metaTitle
    : `${article.title ?? ""} | Pittsburgh Forge Rugby Club`

  const excerpt = toPlainText(article.wpexcerpt)
  const tags = Array.isArray(article.tags) ? (article.tags as string[]) : []

  return (
    <SidebarLayout>
      <article className={`${contentStyles.contentBlock} ${s.pageContent}`}>
        <div className="prose">
          <header className={s.header}>
            <Heading level="h1">{article.title}</Heading>

            {excerpt && (
              <p className={s.excerpt}>
                <Text size="lg">{excerpt}</Text>
              </p>
            )}

            <div className={s.meta}>
              {article.creationDate && (
                <time dateTime={toIsoDate(article.creationDate)}>
                  <Text variant="span" size="sm">
                    Published: {formatDate(article.creationDate)}
                  </Text>
                </time>
              )}

              {article._updatedAt && article.creationDate && (
                <time dateTime={toIsoDate(article._updatedAt)}>
                  <Text variant="span" size="sm">
                    Updated: {formatDate(article._updatedAt)}
                  </Text>
                </time>
              )}

              {article.author?.name && (
                <address>
                  <Text variant="span" size="sm">
                    By: {article.author.name}
                  </Text>
                </address>
              )}
            </div>

            {article.categories.length > 0 && (
              <div className={s.meta}>
                <Text variant="span" size="sm">
                  Categories:
                </Text>
                {article.categories.map((category) => (
                  <Text key={category.name} variant="span" size="sm">
                    {category.name}
                  </Text>
                ))}
              </div>
            )}

            {tags.length > 0 && (
              <div className={s.meta}>
                <Text variant="span" size="sm">
                  Tags:
                </Text>
                {tags.map((tag) => (
                  <Text key={tag} variant="span" size="sm">
                    {tag}
                  </Text>
                ))}
              </div>
            )}
          </header>

          <RenderContent content={toRichText(article.content)} />

          <ShareBar url={shareUrl} title={shareTitle} />
        </div>
      </article>
    </SidebarLayout>
  )
}
