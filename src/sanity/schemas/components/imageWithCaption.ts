import { defineType } from "sanity"

export const imageWithCaption = defineType({
  name: "imageWithCaption",
  title: "Image (with caption)",
  type: "image",
  fields: [
    {
      name: "caption",
      title: "Caption",
      type: "string",
      fieldset: "captionFieldset",
    },
  ],
  fieldsets: [
    {
      name: "captionFieldset",
      title: "Caption Settings",
      options: { collapsible: true, collapsed: true },
    },
  ],
})
