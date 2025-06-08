import { defineField, defineType } from "sanity"

export const columnType = defineType({
  name: "column",
  type: "object",
  fields: [
    defineField({
      name: "content",
      type: "portableText",
    }),
  ],
  preview: {
    select: {
      title: "content",
    },
  },
})
