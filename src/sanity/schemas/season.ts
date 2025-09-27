import { defineType } from "sanity"

export const season = defineType({
  name: "season",
  title: "Season",
  type: "document",
  fields: [
    {
      name: "year",
      title: "Year",
      type: "number",
      validation: (Rule) =>
        Rule.required().min(1900).max(new Date().getFullYear()),
    },
    {
      name: "season",
      title: "Season",
      type: "string",
      options: {
        list: [
          { title: "Fall", value: "Fall" },
          { title: "Spring", value: "Spring" },
        ],
      },
      validation: (Rule) => Rule.required(),
    },
  ],
  preview: {
    select: {
      season: "season",
      year: "year",
    },
    prepare({ season, year }) {
      return {
        title: `${season} ${year}`,
      }
    },
  },
})
