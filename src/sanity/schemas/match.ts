import { defineField, defineType } from "sanity"
import { CalendarIcon } from "@sanity/icons"
import EventNameInput from "../components/EventNameInput"

export const match = defineType({
  name: "match",
  title: "Match",
  type: "document",
  icon: CalendarIcon,
  fields: [
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
      name: "season",
      title: "Season",
      type: "reference",
      to: [{ type: "season" }],
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
      readOnly: ({ document }) => {
        const doc = document as {
          division?: { _ref: string }
          league?: { _ref: string }
        }
        return !doc?.division?._ref || !doc?.league?._ref
      },
      options: {
        filter: ({ document }) => {
          const doc = document as {
            division?: { _ref: string }
            league?: { _ref: string }
          }
          const divisionRef = doc?.division?._ref
          const leagueRef = doc?.league?._ref

          if (!divisionRef || !leagueRef) {
            return {
              filter: "_id == $nothing",
              params: { nothing: "" },
            }
          }

          return {
            filter:
              "division._ref == $divisionRef && league._ref == $leagueRef",
            params: { divisionRef, leagueRef },
          }
        },
      },
    }),
    defineField({
      name: "awayTeam",
      title: "Away Team",
      type: "reference",
      to: [{ type: "team" }],
      readOnly: ({ document }) => {
        const doc = document as {
          division?: { _ref: string }
          league?: { _ref: string }
        }
        return !doc?.division?._ref || !doc?.league?._ref
      },
      options: {
        filter: ({ document }) => {
          const doc = document as {
            division?: { _ref: string }
            league?: { _ref: string }
          }
          const divisionRef = doc?.division?._ref
          const leagueRef = doc?.league?._ref

          if (!divisionRef || !leagueRef) {
            return {
              filter: "_id == $nothing",
              params: { nothing: "" },
            }
          }

          return {
            filter:
              "division._ref == $divisionRef && league._ref == $leagueRef",
            params: { divisionRef, leagueRef },
          }
        },
      },
    }),
    defineField({
      name: "name",
      title: "Event Name",
      type: "string",
      description:
        'A descriptive name for the event, e.g., "Men\'s D1 vs. Cleveland Rovers"',
      validation: (Rule) => Rule.required(),
      components: {
        input: EventNameInput,
      },
    }),
    defineField({
      name: "homeTeamScore",
      title: "Home Team Score",
      type: "number",
      validation: (Rule) => Rule.min(0).integer(),
    }),
    defineField({
      name: "awayTeamScore",
      title: "Away Team Score",
      type: "number",
      validation: (Rule) => Rule.min(0).integer(),
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
        subtitle: `${displayDate}`,
      }
    },
  },
})
