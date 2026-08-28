import { defineField } from "sanity"

export const portableText = defineField({
  name: "portableText",
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
  ],
})
