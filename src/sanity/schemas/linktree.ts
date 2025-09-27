import { DocumentsIcon } from "@sanity/icons"
import { defineField, defineType } from "sanity"

export const linktree = defineType({
  name: "linktree",
  title: "Linktree",
  type: "document",
  icon: DocumentsIcon,
  fields: [
    defineField({
      title: "Primary Group Title",
      name: "primaryGroupTitle",
      type: "string",
      description: "Title for the primary group of links",
    }),
    defineField({
      title: "Primary Links",
      name: "primaryLinks",
      description: "Configure the primary group of links",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            {
              name: "label",
              type: "string",
              title: "Label",
              description: "The text displayed for the link",
            },
            {
              name: "internalLink",
              type: "reference",
              to: [{ type: "page" }, { type: "post" }, { type: "product" }],
              title: "Internal Link",
            },
            {
              name: "customLink",
              type: "url",
              title: "Custom Link",
              description:
                "Use this for external or custom URLs. If set, overrides Menu Item.",
            },
            {
              name: "route",
              type: "string",
              title: "App Router Path",
              description:
                "Specify the relative path for App Router pages (e.g., /about, /contact). Overrides other links if set.",
            },
            {
              name: "openInNewTab",
              type: "boolean",
              title: "Open in new tab",
              description:
                "If checked, the link will open in a new browser tab.",
              initialValue: false,
            },
          ],
          preview: {
            select: {
              title: "label",
              internalLink: "internalLink._type",
              customLink: "customLink",
              route: "route",
            },
            prepare({ title, internalLink, customLink, route }) {
              const subtitle = route
                ? `Route: ${route}`
                : internalLink
                ? `${
                    internalLink.charAt(0).toUpperCase() + internalLink.slice(1)
                  }`
                : customLink
                ? `${customLink}`
                : "No link"
              return {
                title,
                subtitle,
              }
            },
          },
        },
      ],
    }),
    defineField({
      title: "Secondary Group Title",
      name: "secondaryGroupTitle",
      type: "string",
      description: "Title for the secondary group of links",
    }),
    defineField({
      title: "Secondary Links",
      name: "secondaryLinks",
      description: "Configure the secondary group of links",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            {
              name: "label",
              type: "string",
              title: "Label",
              description: "The text displayed for the link",
            },
            {
              name: "internalLink",
              type: "reference",
              to: [{ type: "page" }, { type: "post" }, { type: "product" }],
              title: "Internal Link",
            },
            {
              name: "customLink",
              type: "url",
              title: "Custom Link",
              description:
                "Use this for external or custom URLs. If set, overrides Menu Item.",
            },
            {
              name: "route",
              type: "string",
              title: "App Router Path",
              description:
                "Specify the relative path for App Router pages (e.g., /about, /contact). Overrides other links if set.",
            },
            {
              name: "openInNewTab",
              type: "boolean",
              title: "Open in new tab",
              description:
                "If checked, the link will open in a new browser tab.",
              initialValue: false,
            },
          ],
          preview: {
            select: {
              title: "label",
              internalLink: "internalLink._type",
              customLink: "customLink",
              route: "route",
            },
            prepare({ title, internalLink, customLink, route }) {
              const subtitle = route
                ? `Route: ${route}`
                : internalLink
                ? `${
                    internalLink.charAt(0).toUpperCase() + internalLink.slice(1)
                  }`
                : customLink
                ? `${customLink}`
                : "No link"
              return {
                title,
                subtitle,
              }
            },
          },
        },
      ],
    }),
  ],
  preview: {
    prepare() {
      return {
        title: "Linktree",
      }
    },
  },
})
