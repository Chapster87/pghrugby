import { defineField, defineType } from "sanity"
import { ComposeIcon } from "@sanity/icons"

export const membership = defineType({
  name: "membership",
  title: "Membership Landing Page",
  type: "document",
  groups: [
    {
      default: false,
      icon: ComposeIcon,
      name: "content",
      title: "Content",
    },
    {
      default: false,
      icon: ComposeIcon,
      name: "metadata",
      title: "SEO & Metadata",
    },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Display Title",
      type: "string",
      group: "content",
    }),
    defineField({
      name: "pageBuilder",
      type: "pageBuilder",
      group: "content",
    }),
    defineField({
      name: "date",
      title: "Publish Date",
      type: "datetime",
      group: "content",
    }),
    defineField({
      name: "modified",
      title: "Last Modified",
      type: "datetime",
      description: "Date and time the page was last modified.",
      readOnly: true, // This makes the field read-only in the Studio UI
      // Field will be updated automatically on publish via a custom document action
      group: "content",
    }),
    defineField({
      name: "seo",
      title: "SEO Metadata",
      type: "seo",
      group: "metadata",
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
        title: title || "Membership",
        subtitle: subtitle
          ? `Page Builder: ${subtitle}`
          : "No page builder content",
      }
    },
  },
})
