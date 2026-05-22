import type { Metadata, ResolvingMetadata } from "next"
import { notFound } from "next/navigation"
import { draftMode } from "next/headers"
import SidebarLayout from "@/layouts/sidebar"
import Image from "next/image"
import { executeQuery } from "@/lib/datocms/executeQuery"
import { StructuredText } from "react-datocms"
import { pageSlugs, pageQuery } from "./pages.query"
import Example from "./(example)/page"
import ShareBar from "@/components/share-bar"
import { CloudinaryImage } from "@/types/datocms"
import { ResultOf, readFragment } from "@/lib/datocms/graphql"
import { getCloudinaryImageProps } from "@/utils/cloudinary"
import { fileFieldFragment } from "@fragments/blocks"
import { StructuredArticleData } from "@/types/structured-data"

import contentStyles from "@/styles/content.module.css"
import s from "./styles.module.css"

type PageContentBlocks = NonNullable<
  NonNullable<ResultOf<typeof pageQuery>["page"]>["content"]
>["blocks"][number]

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
  props: { params: { slug: string } },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { isEnabled } = await draftMode()
  const { slug } = await props.params

  const { page } = await executeQuery(pageQuery, {
    variables: { slug },
    excludeInvalid: false,
    includeDrafts: isEnabled,
  })

  if (!page) {
    return {}
  }

  // Build canonical URL using current URL and slug
  const url = new URL((await parent).metadataBase || "https://pghrugby.com")
  url.pathname = `/${slug}`

  const publishDate = page.creationDate
    ? new Date(page.creationDate).toISOString()
    : undefined
  const modifiedDate = page._updatedAt
    ? new Date(page._updatedAt).toISOString()
    : undefined

  const structuredData = generateStructuredData(page, slug)

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
  page: any,
  slug: string
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
      "@id": page.canonicalUrl || `https://pghrugby.com/${slug}`,
    },
  }
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params
  const { isEnabled: isDraftModeEnabled } = await draftMode()

  const { page } = await executeQuery(pageQuery, {
    variables: { slug },
    excludeInvalid: false,
    includeDrafts: isDraftModeEnabled,
    baseEditingUrl: true,
  })

  if (!page) {
    notFound()
  }

  const shareUrl = page?.canonicalUrl ?? `https://pghrugby.com/${slug}`
  const shareTitle = page?.metaTitle
    ? page.metaTitle
    : `${page?.title ?? ""} | Pittsburgh Forge Rugby Club`

  if (slug === "example") {
    return <Example data={page} />
  }

  return (
    <SidebarLayout>
      <article className={`${contentStyles.contentBlock} ${s.pageContent}`}>
        <div className="prose max-w-none">
          {/* Featured image with proper alt text */}
          {/* {(page.featuredImage as CloudinaryImage) && (
            <div className="mb-6 relative aspect-video w-full">
              <Image
                src={(page.featuredImage as CloudinaryImage).secure_url}
                alt={page.title || "Featured image"}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                priority
                className="object-cover rounded-lg"
              />
            </div>
          )} */}

          <header className="mb-8">
            <h1>{page.title}</h1>

            <div className="flex flex-wrap gap-2 text-sm text-gray-500 dark:text-gray-400">
              {page.creationDate && (
                <time dateTime={new Date(page.creationDate).toISOString()}>
                  Published: {new Date(page.creationDate).toLocaleDateString()}
                </time>
              )}

              {page._updatedAt && page.creationDate && page._updatedAt && (
                <time dateTime={new Date(page._updatedAt).toISOString()}>
                  Updated: {new Date(page._updatedAt).toLocaleDateString()}
                </time>
              )}

              {page.author?.name && (
                <address className="not-italic">By: {page.author.name}</address>
              )}
            </div>
          </header>

          <div className="">
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

          <ShareBar url={shareUrl} title={shareTitle} />
        </div>
      </article>
    </SidebarLayout>
  )
}
