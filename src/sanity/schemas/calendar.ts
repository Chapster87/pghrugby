import { defineField, defineType } from "sanity"

export const calendar = defineType({
  name: "calendar",
  title: "Calendar",
  type: "object",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      description: "Optional title for the calendar section.",
    }),
    defineField({
      name: "events",
      title: "Events",
      type: "array",
      of: [{ type: "match" }],
    }),
  ],
  preview: {
    select: {
      title: "title",
      events: "events",
    },
    prepare({ title, events }) {
      const eventCount = events ? events.length : 0
      return {
        title: title || "Calendar",
        subtitle: `${eventCount} event${eventCount === 1 ? "" : "s"}`,
      }
    },
  },
})
