import { defineField, defineType } from "sanity"

export const seo = defineType({
  name: "seo",
  title: "SEO Metadata",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      description: "The meta title for the page. Keep it under 60 characters.",
      validation: (Rule) =>
        Rule.max(60).warning("Titles should be under 60 characters."),
    }),
    defineField({
      name: "description",
      title: "Meta Description",
      type: "text",
      description:
        "The meta description for the page. Keep it under 160 characters.",
      validation: (Rule) =>
        Rule.max(160).warning("Descriptions should be under 160 characters."),
    }),
    defineField({
      name: "keywords",
      title: "Keywords",
      type: "array",
      of: [{ type: "string" }],
      description: "A list of keywords relevant to the page.",
      initialValue: [
        "rugby",
        "Pittsburgh Rugby",
        "rugby club",
        "usa rugby",
        "rugby union",
      ],
    }),
    defineField({
      name: "canonicalUrl",
      title: "Canonical URL",
      type: "url",
      description:
        "The canonical URL for the page to avoid duplicate content issues. Defaults to the page URL if not provided",
    }),
    defineField({
      name: "robots",
      title: "Robots Meta Tag",
      type: "string",
      description:
        'Control search engine indexing behavior (e.g., "index, follow" or "noindex, nofollow"). Defaults to "index, follow".',
      initialValue: "index, follow",
    }),
    defineField({
      name: "ogTitle",
      title: "Open Graph Title",
      type: "string",
      description:
        "The title used for Open Graph (social sharing). Defaults to the meta title if not provided.",
    }),
    defineField({
      name: "ogDescription",
      title: "Open Graph Description",
      type: "text",
      description:
        "The description used for Open Graph (social sharing). Defaults to the meta description if not provided.",
    }),
    defineField({
      name: "ogImage",
      title: "Open Graph Image",
      type: "image",
      description: "The image used for Open Graph (social sharing).",
      options: {
        hotspot: true,
      },
    }),
    defineField({
      name: "ogUrl",
      title: "Open Graph URL",
      type: "url",
      description:
        "The URL used for Open Graph (social sharing). Defaults to the page URL if not provided.",
    }),
    defineField({
      name: "twitterTitle",
      title: "Twitter Card Title",
      type: "string",
      description:
        "The title used for Twitter cards. Defaults to the meta title if not provided.",
    }),
    defineField({
      name: "twitterDescription",
      title: "Twitter Card Description",
      type: "text",
      description:
        "The description used for Twitter cards. Defaults to the meta description if not provided.",
    }),
    defineField({
      name: "twitterImage",
      title: "Twitter Card Image",
      type: "image",
      description:
        "The image used for Twitter cards. Defaults to the Open Graph image if not provided.",
      options: {
        hotspot: true,
      },
    }),
  ],
})
