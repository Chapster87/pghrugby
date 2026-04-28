import { defineType } from "sanity"

export const shortText = defineType({
  name: "shortText",
  title: "Short Text Block",
  type: "object",
  fields: [
    {
      name: "content",
      title: "Content",
      type: "array",
      of: [{ type: "string" }],
    },
  ],
  preview: {
    select: {
      subtitle: "content.0",
    },
    prepare(selection) {
      const { subtitle } = selection
      return {
        title: "Short Text Block",
        subtitle: subtitle || "No content",
      }
    },
  },
})
