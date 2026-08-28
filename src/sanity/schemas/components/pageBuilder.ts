import { defineField } from "sanity"

export const pageBuilder = defineField({
  name: "pageBuilder",
  type: "array",
  of: [{ type: "heading" }, { type: "richText" }, { type: "linkGroup" }],
})
