import { defineType } from "sanity"

export const buttonBlockType = defineType({
  name: "button",
  title: "Button",
  type: "object",
  fields: [
    {
      name: "text",
      title: "Button Text",
      type: "string",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "url",
      title: "URL",
      type: "url",
      validation: (Rule) => Rule.required(),
    },
    {
      name: "style",
      title: "CSS Class",
      type: "string",
    },
    {
      name: "target",
      title: "Target",
      type: "string",
      options: {
        list: [
          { title: "Same tab", value: "_self" },
          { title: "New tab", value: "_blank" },
        ],
      },
    },
    {
      name: "rel",
      title: "Rel Attribute",
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
        title: selection.title || "Button",
        subtitle: selection.subtitle,
      }
    },
  },
})
