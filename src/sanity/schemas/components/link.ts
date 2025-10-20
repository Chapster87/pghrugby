import { defineType } from "sanity"

export const link = defineType({
  name: "link",
  title: "Link",
  type: "object",
  fields: [
    {
      name: "text",
      title: "Link Text",
      type: "string",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "reference",
      type: "reference",
      to: [{ type: "page" }, { type: "post" }, { type: "product" }],
      title: "Internal Link",
    },
    {
      name: "customLink",
      type: "url",
      title: "External Link",
      description:
        "Use this for external or custom URLs. If set, overrides Internal Link.",
    },
    {
      name: "route",
      type: "string",
      title: "App Router Path",
      description:
        "Specify the relative path for App Router pages (e.g., /about, /contact). Overrides other links if set.",
    },
    {
      name: "openInNewTab",
      type: "boolean",
      title: "Open in new tab",
      description: "If checked, the link will open in a new browser tab.",
      initialValue: false,
    },
    {
      name: "asButton",
      title: "Style as Button",
      type: "boolean",
    },
    {
      name: "style",
      title: "CSS Class",
      type: "string",
    },
  ],
  preview: {
    select: {
      title: "text",
      subtitle: "url",
    },
    prepare(selection) {
      return {
        title: selection.title || "Link",
        subtitle: selection.subtitle,
      }
    },
  },
})
