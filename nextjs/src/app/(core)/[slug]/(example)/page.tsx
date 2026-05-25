import contentStyles from "@/styles/content.module.css"
import Image from "next/image"
import PortableText from "@/components/PortableText"
import Heading from "@/components/typography/heading"
import Text from "@/components/typography/text"
import { extractPlainText, isPortableText } from "@/lib/util/portableTextUtils"
import s from "./style.module.css"

// JSON-LD schema.org structured data
function generateStructuredData(data: any) {
  if (!data) return null

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: data.title,
    description: extractPlainText(data.excerpt) || "",
    image: data.featuredMedia?.asset?.url || "",
    datePublished: data.date || "",
    dateModified: data.modified || data.date || "",
    author: data.author?.name
      ? {
          "@type": "Person",
          name: data.author.name,
        }
      : undefined,
    publisher: {
      "@type": "Organization",
      name: "Pittsburgh Forge Rugby Club",
      logo: {
        "@type": "ImageObject",
        url: "https://pghrugby.com/logo.png", // Update with actual logo URL
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://pghrugby.com/${data.slug}`,
    },
  }
}

export default function Example({ data }: { data: any }) {
  const structuredData = generateStructuredData(data)
  return (
    <article className={`${contentStyles.contentBlock} ${s.exampleArticle}`}>
      <div className="prose">
        {/* Structured data for SEO */}
        {structuredData && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
          />
        )}

        {/* Featured image with proper alt text */}
        {data.featuredMedia?.asset?.url && (
          <div className={s.featuredImageWrapper}>
            <Image
              src={data.featuredMedia.asset.url}
              alt={data.featuredMedia.alt || data.title || "Featured image"}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority
              className={s.featuredImage}
            />
          </div>
        )}

        <header className={s.header}>
          <Heading level="h1">{data.title}</Heading>

          {isPortableText(data.excerpt) && (
            <div className={s.excerpt}>
              <PortableText value={data.excerpt} />
            </div>
          )}

          <div className={s.meta}>
            {data.date && (
              <time dateTime={new Date(data.date).toISOString()}>
                <Text variant="span" size="sm">
                  Published: {new Date(data.date).toLocaleDateString()}
                </Text>
              </time>
            )}

            {data.modified && data.date !== data.modified && (
              <time dateTime={new Date(data.modified).toISOString()}>
                <Text variant="span" size="sm">
                  Updated: {new Date(data.modified).toLocaleDateString()}
                </Text>
              </time>
            )}

            {data.author?.name && (
              <address>
                <Text variant="span" size="sm">
                  By: {data.author.name}
                </Text>
              </address>
            )}

            {data.status && (
              <span className={s.statusBadge}>
                <Text variant="span" size="sm">
                  {data.status}
                </Text>
              </span>
            )}
          </div>
        </header>

        <div className="">
          {isPortableText(data.content) ? (
            <PortableText value={data.content} />
          ) : (
            <p>No content available.</p>
          )}
        </div>
      </div>
    </article>
  )
}
