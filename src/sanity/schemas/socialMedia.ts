import { defineField, defineType } from "sanity"

export const socialMedia = defineType({
  name: "socialMedia",
  title: "Social Media",
  type: "document",
  fields: [
    defineField({
      name: "facebook",
      title: "Facebook URL",
      type: "url",
      validation: (rule) => rule.uri({ scheme: ["http", "https"] }),
    }),
    defineField({
      name: "instagram",
      title: "Instagram URL",
      type: "url",
      validation: (rule) => rule.uri({ scheme: ["http", "https"] }),
    }),
    defineField({
      name: "youtube",
      title: "YouTube URL",
      type: "url",
      validation: (rule) => rule.uri({ scheme: ["http", "https"] }),
    }),
    defineField({
      name: "twitter",
      title: "Twitter URL",
      type: "url",
      validation: (rule) => rule.uri({ scheme: ["http", "https"] }),
    }),
  ],
  preview: {
    prepare() {
      return {
        title: "Social Media Links",
      }
    },
  },
})
