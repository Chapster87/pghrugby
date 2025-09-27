import { defineField, defineType } from "sanity"

export const division = defineType({
  name: "division",
  title: "Division",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: {
        source: "name",
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "shortName",
      title: "Short Name",
      type: "string",
    }),
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "shortName",
    },
  },
})
