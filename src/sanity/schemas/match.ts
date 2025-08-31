import { defineField, defineType } from "sanity"
import { CalendarIcon } from "@sanity/icons"

export const match = defineType({
  name: "match",
  title: "Match",
  type: "document",
  icon: CalendarIcon,
  fields: [
    defineField({
      name: "name",
      title: "Event Name",
      type: "string",
      description:
        'A descriptive name for the event, e.g., "Men\'s D1 vs. Cleveland Rovers"',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "eventDateTime",
      title: "Event Date and Time",
      type: "datetime",
      options: {
        dateFormat: "YYYY-MM-DD",
        timeFormat: "h:mm a",
      },
      validation: (Rule) => Rule.required(),
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
    defineField({
      name: "matchType",
      title: "Match Type",
      type: "string",
      options: {
        list: [
          { title: "Competitive", value: "competitive" },
          { title: "Friendly", value: "friendly" },
        ],
      },
    }),
    defineField({
      name: "homeTeam",
      title: "Home Team",
      type: "reference",
      to: [{ type: "team" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "awayTeam",
      title: "Away Team",
      type: "reference",
      to: [{ type: "team" }],
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {
      title: "name",
      home: "homeTeam",
      away: "awayTeam",
      datetime: "eventDateTime",
    },
    prepare({ title, home, away, datetime }) {
      const displayDate = datetime
        ? new Date(datetime).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })
        : "No date"
      const subtitle = `${home || "TBD"} vs ${away || "TBD"}`
      return {
        title: title,
        subtitle: `${subtitle} on ${displayDate}`,
      }
    },
  },
})
