import { defineField, defineType } from "sanity"
import { UsersIcon } from "@sanity/icons"

export const team = defineType({
  name: "team",
  title: "Team",
  type: "document",
  icon: UsersIcon,
  fields: [
    defineField({
      name: "teamName",
      title: "Team Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "teamLogo",
      title: "Team Logo",
      type: "image",
    }),
    defineField({
      name: "league",
      title: "League",
      type: "reference",
      to: [{ type: "league" }],
    }),
    defineField({
      name: "division",
      title: "Division",
      type: "reference",
      to: [{ type: "division" }],
    }),
  ],
  preview: {
    select: {
      title: "teamName",
      media: "teamLogo",
      league: "league.name",
      division: "division.name",
    },
    prepare({ title, media, league, division }) {
      const subtitle = `${league || "TBD"} - ${division || "TBD"}`
      return {
        media: media,
        title: title,
        subtitle: `${subtitle}`,
      }
    },
  },
})
