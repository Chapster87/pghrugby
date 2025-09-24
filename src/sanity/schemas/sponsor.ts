import { defineField, defineType } from "sanity"
import { LinkIcon } from "@sanity/icons"

export const sponsor = defineType({
  name: "sponsor",
  title: "Sponsor",
  type: "document",
  icon: LinkIcon,
  fields: [
    defineField({
      name: "sponsorName",
      title: "Sponsor Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "sponsorLogo",
      title: "Sponsor Logo",
      type: "image",
    }),
    defineField({
      name: "url",
      title: "URL",
      type: "url",
      validation: (Rule) =>
        Rule.uri({
          allowRelative: true, // Allow relative URLs
        }),
    }),
    defineField({
      name: "nofollow",
      title: "No Follow",
      type: "boolean",
      description: 'Add rel="nofollow" to the link',
      initialValue: false,
    }),
    defineField({
      name: "openInNewTab",
      title: "Open in New Tab",
      type: "boolean",
      description: "Open the link in a new tab",
      initialValue: false,
    }),
    defineField({
      name: "width",
      title: "Width",
      type: "number",
      description: "Optional width for the sponsor logo",
    }),
    defineField({
      name: "height",
      title: "Height",
      type: "number",
      description: "Optional height for the sponsor logo",
    }),
  ],
  preview: {
    select: {
      title: "sponsorName",
      media: "sponsorLogo",
      url: "url",
    },
    prepare({ title, media, url }) {
      return {
        media: media,
        title: title,
        subtitle: url,
      }
    },
  },
})
