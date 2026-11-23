import { describe, expect, it } from "vitest"

import {
  articleStructuredData,
  blogPostingStructuredData,
  sportsOrganizationStructuredData,
  type StructuredDataInput,
} from "./structured-data"

/**
 * A post fixture. Overrides let each spec state only the field it is exercising,
 * so a spec reads as the difference that matters.
 */
function input(overrides: Partial<StructuredDataInput> = {}): StructuredDataInput {
  return {
    title: "Season Preview",
    metaTitle: null,
    metaDescription: null,
    excerpt: "<p>Forge &amp; rugby</p>",
    imageUrl: "https://example.test/meta.jpg",
    canonicalUrl: null,
    publishedAt: "2026-11-17T15:30:00Z",
    updatedAt: "2026-11-18T09:00:00Z",
    authorName: "Andy",
    path: "/post/season-preview",
    ...overrides,
  }
}

describe("structured data variants", () => {
  it("shares the scaffolding across all three variants", () => {
    const variants = [
      articleStructuredData(input()),
      blogPostingStructuredData(input()),
      sportsOrganizationStructuredData(input()),
    ]

    for (const data of variants) {
      expect(data["@context"]).toBe("https://schema.org")
      expect(data.headline).toBe("Season Preview | Pittsburgh Forge Rugby Club")
      expect(data.description).toBe("Forge & rugby")
      expect(data.image).toBe("https://example.test/meta.jpg")
      expect(data.datePublished).toBe("2026-11-17T15:30:00.000Z")
      expect(data.dateModified).toBe("2026-11-18T09:00:00.000Z")
      expect(data.publisher).toEqual({
        "@type": "Organization",
        name: "Pittsburgh Forge Rugby Club",
        logo: {
          "@type": "ImageObject",
          url: "https://example.test/meta.jpg",
        },
      })
      expect(data.mainEntityOfPage).toEqual({
        "@type": "WebPage",
        "@id": "https://pghrugby.com/post/season-preview",
      })
    }
  })

  it("keeps the variants distinguishable by type", () => {
    expect(articleStructuredData(input())["@type"]).toBe("Article")
    expect(blogPostingStructuredData(input())["@type"]).toBe("BlogPosting")
    expect(sportsOrganizationStructuredData(input())["@type"]).toBe(
      "SportsOrganization"
    )
  })

  it("adds the author to the article variants only", () => {
    expect(articleStructuredData(input()).author).toEqual({
      "@type": "Person",
      name: "Andy",
    })
    expect(blogPostingStructuredData(input()).author).toEqual({
      "@type": "Person",
      name: "Andy",
    })
    expect(sportsOrganizationStructuredData(input()).author).toBeUndefined()
  })

  it("describes the club on the homepage variant", () => {
    const data = sportsOrganizationStructuredData(input({ path: "/" }))

    expect(data.sport).toBe("Rugby")
    expect(data.location).toBe("Pittsburgh, PA")
    expect(data.name).toBe("Season Preview | Pittsburgh Forge Rugby Club")
    expect(data.url).toBe("https://pghrugby.com/")
  })

  it("prefers editor-supplied metadata", () => {
    const data = articleStructuredData(
      input({ metaTitle: "Custom", metaDescription: "Custom description" })
    )

    expect(data.headline).toBe("Custom")
    expect(data.description).toBe("Custom description")
  })

  it("falls back to the logo when the record has no meta image", () => {
    const data = articleStructuredData(input({ imageUrl: null }))

    expect(data.image).toBe("https://pghrugby.com/logo.png")
    expect(data.publisher.logo.url).toBe("https://pghrugby.com/logo.png")
  })

  it("prefers the canonical URL when one is set", () => {
    const data = articleStructuredData(
      input({ canonicalUrl: "https://example.test/canonical" })
    )

    expect(data.mainEntityOfPage["@id"]).toBe("https://example.test/canonical")
  })

  it("omits the author when the record has none", () => {
    expect(articleStructuredData(input({ authorName: null })).author).toBeUndefined()
  })

  it("leaves dates empty when the record has none", () => {
    const data = articleStructuredData(
      input({ publishedAt: null, updatedAt: null })
    )

    expect(data.datePublished).toBe("")
    expect(data.dateModified).toBe("")
  })
})
