import { defineField, defineType } from "sanity"

export const sponsorBar = defineType({
  name: "sponsorBar",
  title: "Sponsor Bar",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "items",
      title: "Sponsor Items",
      type: "array",
      of: [
        defineField({
          name: "sponsorItem",
          title: "Sponsor Item",
          type: "object",
          fields: [
            defineField({
              name: "sponsor",
              title: "Sponsor",
              type: "reference",
              to: [{ type: "sponsor" }],
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: {
              title: "sponsor.sponsorName",
              media: "sponsor.sponsorLogo",
              subtitle: "sponsor.url",
            },
            prepare(selection) {
              const { title, media, subtitle } = selection
              return {
                title,
                media,
                subtitle: subtitle || "No URL provided",
              }
            },
          },
        }),
      ],
    }),
  ],
})
