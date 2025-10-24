import { defineField, defineType } from "sanity"

export const homepage = defineType({
  name: "homepage",
  title: "Homepage",
  type: "document",
  fields: [
    defineField({
      name: "pageBuilder",
      type: "pageBuilder",
    }),
    defineField({
      name: "seo",
      title: "SEO Metadata",
      type: "seo",
    }),
  ],
  preview: {
    select: {
      title: "pageBuilder.0.children.0.text",
      subtitle: "pageBuilder.0.type",
    },
    prepare(selection) {
      const { title, subtitle } = selection
      return {
        title: title || "Homepage",
        subtitle: subtitle
          ? `Page Builder: ${subtitle}`
          : "No page builder content",
      }
    },
  },
})
