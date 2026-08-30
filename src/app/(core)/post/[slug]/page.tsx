import type { Metadata, ResolvingMetadata } from "next"
import { notFound } from "next/navigation"
import { draftMode } from "next/headers"
import SidebarLayout from "@/layouts/sidebar"
import Image from "next/image"
import { executeQuery } from "@/lib/datocms/executeQuery"
import { StructuredText } from "react-datocms"
import { postSlugs, postQuery } from "./posts.query"
import ShareBar from "@/components/share-bar"
import Heading from "@/components/typography/heading"
import Text from "@/components/typography/text"
import { CloudinaryImage } from "@/types/datocms"
import { ResultOf, readFragment } from "@/lib/datocms/graphql"
import { getCloudinaryImageProps } from "@/utils/cloudinary"
import { fileFieldFragment } from "@fragments/blocks"
import { StructuredArticleData } from "@/types/structured-data"
import CloudinaryImageRenderer from "@/components/cloudinary-image-renderer"

import contentStyles from "@/styles/content.module.css"
import s from "./styles.module.css"

type PostContentBlocks = NonNullable<
  NonNullable<ResultOf<typeof postQuery>["article"]>["content"]
>["blocks"][number]

type PostProps = {
  params: Promise<{ slug: string }>
}

/**
 * Strip HTML tags from a string. Used for WordPress-authored excerpts
 * (wpexcerpt), which arrive as rendered HTML.
 * @param html - The HTML string to strip, if any.
 * @returns The plain-text content, trimmed, or an empty string.
 */
function stripHtml(html?: string | null): string {
  return html ? html.replace(/<[^>]*>/g, "").trim() : ""
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
  const { isEnabled } = await draftMode()
  const { slug } = await props.params

  const { article } = await executeQuery(postQuery, {
    variables: { slug },
    excludeInvalid: false,
    includeDrafts: isEnabled,
  })

  if (!article) {
    return {}
  }

  // Build canonical URL using current URL and slug
  const url = new URL((await parent).metadataBase || "https://pghrugby.com")
  url.pathname = `/post/${slug}`

  const publishDate = article.creationDate
    ? new Date(article.creationDate).toISOString()
    : undefined
  const modifiedDate = article._updatedAt
    ? new Date(article._updatedAt).toISOString()
    : undefined

  const structuredData = generateStructuredData(article, slug)

  const ogImageUrl =
    article.metaImage &&
    Array.isArray(article.metaImage) &&
    article.metaImage[0]?.url
      ? article.metaImage[0].url
      : undefined

  return {
    title: article.metaTitle || `${article.title || ""} | Pittsburgh Forge Rugby Club`,
    description: article.metaDescription || undefined,
    alternates: {
      canonical: article.canonicalUrl || url.toString(),
    },
    openGraph: {
      title: article.metaTitle || article.title || undefined,
      description:
        article.metaDescription || stripHtml(article.wpexcerpt) || undefined,
      url: article.canonicalUrl || url.toString(),
      images: ogImageUrl ? [{ url: ogImageUrl }] : undefined,
      type: "article",
      publishedTime: publishDate,
      modifiedTime: modifiedDate,
      authors: article.author?.name ? [article.author.name] : [],
    },
    twitter: {
      title: article.metaTitle || article.title || undefined,
      description:
        article.metaDescription || stripHtml(article.wpexcerpt) || undefined,
      images: ogImageUrl ? [{ url: ogImageUrl }] : undefined,
    },
    other: {
      "application/ld+json": JSON.stringify(structuredData),
    },
  } satisfies Metadata
}

// JSON-LD schema.org structured data
function generateStructuredData(
  article: any,
  slug: string
): StructuredArticleData {
  const imageUrl =
    (article.metaImage &&
      Array.isArray(article.metaImage) &&
      article.metaImage.length > 0 &&
      article.metaImage[0].url) ||
    "https://pghrugby.com/logo.png"

  const publishDate = article.creationDate
    ? new Date(article.creationDate).toISOString()
    : ""
  const modifiedDate = article._updatedAt
    ? new Date(article._updatedAt).toISOString()
    : ""

  const headline =
    article.metaTitle ||
    (article.title ? `${article.title} | Pittsburgh Forge Rugby Club` : "")
  const description =
    article.metaDescription || stripHtml(article.wpexcerpt)

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline,
    description,
    image: imageUrl,
    datePublished: publishDate,
    dateModified: modifiedDate,
    author: article.author?.name
      ? {
          "@type": "Person",
          name: article.author.name,
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
      "@id": article.canonicalUrl || `https://pghrugby.com/post/${slug}`,
    },
  }
}

export default async function PostPage({ params }: PostProps) {
  const { slug } = await params
  const { isEnabled: isDraftModeEnabled } = await draftMode()

  const { article } = await executeQuery(postQuery, {
    variables: { slug },
    excludeInvalid: false,
    includeDrafts: isDraftModeEnabled,
    baseEditingUrl: true,
  })

  if (!article) {
    notFound()
  }

  const shareUrl =
    article.canonicalUrl || `https://pghrugby.com/post/${slug}`
  const shareTitle = article.metaTitle
    ? article.metaTitle
    : `${article.title ?? ""} | Pittsburgh Forge Rugby Club`

  const excerpt = stripHtml(article.wpexcerpt)
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
                <time dateTime={new Date(article.creationDate).toISOString()}>
                  <Text variant="span" size="sm">
                    Published:{" "}
                    {new Date(article.creationDate).toLocaleDateString()}
                  </Text>
                </time>
              )}

              {article._updatedAt && article.creationDate && (
                <time dateTime={new Date(article._updatedAt).toISOString()}>
                  <Text variant="span" size="sm">
                    Updated: {new Date(article._updatedAt).toLocaleDateString()}
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

          <div className="">
            {article.content && (
              <StructuredText
                data={article.content}
                renderBlock={({ record }) => {
                  const typedRecord = record as PostContentBlocks
                  switch (typedRecord.__typename) {
                    case "ExternalImageBlockRecord":
                      if (typedRecord.cloudinary) {
                        const image = typedRecord.cloudinary as CloudinaryImage
                        return CloudinaryImageRenderer({
                          src: image.secure_url,
                          alt: image.public_id,
                          width: image.width,
                          height: image.height,
                        })
                      } else if (typedRecord.url) {
                        const image = getCloudinaryImageProps(typedRecord.url)
                        return CloudinaryImageRenderer({
                          src: image.url,
                          alt: "",
                          width: image.width,
                          height: image.height,
                        })
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
                        // For videos, returning a link/player to the video.
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

          <ShareBar url={shareUrl} title={shareTitle} />
        </div>
      </article>
    </SidebarLayout>
  )
}
