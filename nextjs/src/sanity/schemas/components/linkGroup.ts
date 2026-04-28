import { defineType } from "sanity"

export const linkGroup = defineType({
  name: "linkGroup",
  title: "Link Group",
  type: "object",
  fields: [
    {
      name: "links",
      title: "Links",
      type: "array",
      of: [{ type: "link" }],
      validation: (Rule) => Rule.min(1),
    },
    {
      name: "alignment",
      title: "Alignment",
      type: "string",
      options: {
        list: [
          { title: "Left", value: "left" },
          { title: "Center", value: "center" },
          { title: "Right", value: "right" },
        ],
      },
      initialValue: "left",
    },
  ],
  preview: {
    select: {
      links: "links",
    },
    prepare({ links }: { links: { text: string }[] }) {
      const linkTitles =
        links
          ?.map((link) => link.text)
          .filter(Boolean)
          .join(", ") || "No Links"
      return {
        title: `Link Group: ${linkTitles}`,
      }
    },
  },
})
