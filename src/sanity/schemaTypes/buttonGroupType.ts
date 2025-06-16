import { defineType } from "sanity"

export const buttonGroupType = defineType({
  name: "buttonGroup",
  title: "Button Group",
  type: "object",
  fields: [
    {
      name: "buttons",
      title: "Buttons",
      type: "array",
      of: [{ type: "button" }],
      validation: (Rule) => Rule.min(1),
    },
  ],
  preview: {
    select: {
      buttons: "buttons",
    },
    prepare({ buttons }) {
      return {
        title: `${buttons?.length || 0} Button${
          buttons?.length === 1 ? "" : "s"
        }`,
      }
    },
  },
})
