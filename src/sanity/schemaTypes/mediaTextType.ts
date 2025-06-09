import { defineType } from "sanity"

export const mediaTextType = defineType({
  name: "mediaText",
  title: "Media & Text",
  type: "object",
  fields: [
    {
      name: "image",
      title: "Image",
      type: "image",
    },
    {
      name: "text",
      title: "Text",
      type: "portableText",
    },
  ],
  preview: {
    select: {
      title: "text.0.children.0.text",
      media: "image.asset",
      caption: "image.caption",
    },
    prepare(selection) {
      const { title, media, caption } = selection
      return {
        title: title || "Media & Text Block",
        subtitle: caption || "",
        media,
      }
    },
  },
})
