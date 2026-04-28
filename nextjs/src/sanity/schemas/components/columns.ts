import { defineField, defineType } from "sanity"

export const columns = defineType({
  name: "columns",
  type: "object",
  fields: [
    defineField({
      name: "columns",
      type: "array",
      of: [{ type: "column" }],
    }),
  ],
  preview: {
    select: {
      columns: "columns",
    },
    prepare({ columns }) {
      const columnsCount = columns.length
      return {
        title: `${columnsCount} column${columnsCount == 1 ? "" : "s"}`,
      }
    },
  },
})

export const column = defineType({
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
