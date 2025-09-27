import contentStyles from "@/styles/content.module.css"
import Image from "next/image"
import PortableText from "@/components/PortableText"
import { extractPlainText, isPortableText } from "@/lib/util/portableTextUtils"

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
    <article
      className={`${contentStyles.contentMain} light 2xl:container px-4 py-6 mx-auto`}
    >
      {/* <div className="prose max-w-none"> */}
      {/* Structured data for SEO */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}

      {/* Featured image with proper alt text */}
      {data.featuredMedia?.asset?.url && (
        <div className="mb-6 relative aspect-video w-full">
          <Image
            src={data.featuredMedia.asset.url}
            alt={data.featuredMedia.alt || data.title || "Featured image"}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority
            className="object-cover rounded-lg"
          />
        </div>
      )}

      <header className="mb-8">
        <h1>{data.title}</h1>

        {isPortableText(data.excerpt) && (
          <div className="text-lg font-medium text-gray-600 dark:text-gray-300 mb-4">
            <PortableText value={data.excerpt} />
          </div>
        )}

        <div className="flex flex-wrap gap-2 text-sm text-gray-500 dark:text-gray-400">
          {data.date && (
            <time dateTime={new Date(data.date).toISOString()}>
              Published: {new Date(data.date).toLocaleDateString()}
            </time>
          )}

          {data.modified && data.date !== data.modified && (
            <time dateTime={new Date(data.modified).toISOString()}>
              Updated: {new Date(data.modified).toLocaleDateString()}
            </time>
          )}

          {data.author?.name && (
            <address className="not-italic">By: {data.author.name}</address>
          )}

          {data.status && (
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded text-xs">
              {data.status}
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
      {/* </div> */}
    </article>
  )
}
