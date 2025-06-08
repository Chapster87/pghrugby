import { defineType } from "sanity"

export const imageWithCaptionType = defineType({
  name: "imageWithCaption",
  title: "Image (with caption)",
  type: "image",
  fields: [
    {
      name: "caption",
      title: "Caption",
      type: "string",
      options: {
        isHighlighted: true,
      },
    },
  ],
})
