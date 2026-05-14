/**
 * Structured data for an Article following Schema.org.
 * Used for SEO purposes, specifically for JSON-LD within a script tag.
 */
export interface StructuredArticleData {
  "@context": "https://schema.org"
  "@type": "Article"
  headline: string
  description: string
  image: string
  datePublished: string
  dateModified: string
  author?: {
    "@type": "Person"
    name: string
  }
  publisher: {
    "@type": "Organization"
    name: string
    logo: {
      "@type": "ImageObject"
      url: string
    }
  }
  mainEntityOfPage: {
    "@type": "WebPage"
    "@id": string
  }
}
