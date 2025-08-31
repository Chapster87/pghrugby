import { defineType } from "sanity"

export const blockGroup = defineType({
  name: "blockGroup",
  title: "Block Group",
  type: "object",
  fields: [
    {
      name: "children",
      title: "Children",
      type: "array",
      of: [
        { type: "block" },
        { type: "blockGroup" },
        { type: "image" },
        { type: "imageWithCaption" },
        { type: "mediaText" },
        { type: "columns" },
        { type: "button" },
        { type: "buttonGroup" },
        // Add other block types as needed
      ],
    },
  ],
  preview: {
    select: {
      children: "children",
    },
    prepare({ children }) {
      return {
        title: `Block Group (${children?.length || 0} items)`,
      }
    },
  },
})
