import { DocumentsIcon } from "@sanity/icons"
import { defineField, defineType } from "sanity"

export const navigation = defineType({
  name: "navigation",
  title: "Navigation",
  type: "document",
  icon: DocumentsIcon,
  fields: [
    defineField({
      title: "Main Navigation",
      name: "mainNav",
      description: "Select pages for the top menu",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            {
              name: "item",
              type: "reference",
              to: [{ type: "page" }, { type: "post" }, { type: "product" }],
              title: "Menu Item",
            },
            {
              name: "customLink",
              type: "url",
              title: "Custom Link",
              description:
                "Use this for external or custom URLs. If set, overrides Menu Item.",
            },
            {
              name: "overrideTitle",
              type: "string",
              title: "Override Title",
              description:
                "Optional: Use this to override the page or post title in the navigation.",
            },
            {
              name: "submenu",
              title: "Submenu",
              type: "array",
              of: [
                {
                  type: "object",
                  fields: [
                    {
                      name: "item",
                      type: "reference",
                      to: [
                        { type: "page" },
                        { type: "post" },
                        { type: "product" },
                      ],
                      title: "Submenu Item",
                    },
                    {
                      name: "customLink",
                      type: "url",
                      title: "Custom Link",
                      description:
                        "Use this for external or custom URLs. If set, overrides Menu Item.",
                    },
                    {
                      name: "overrideTitle",
                      type: "string",
                      title: "Override Title",
                      description:
                        "Optional: Use this to override the page or post title in the navigation.",
                    },
                    {
                      name: "openInNewTab",
                      type: "boolean",
                      title: "Open in new tab",
                      description:
                        "If checked, the link will open in a new browser tab.",
                      initialValue: false,
                    },
                    {
                      name: "route",
                      type: "string",
                      title: "App Router Path",
                      description:
                        "Specify the relative path for App Router pages (e.g., /about, /contact). Overrides other links if set.",
                    },
                  ],
                  preview: {
                    select: {
                      title: "overrideTitle",
                      overrideTitle: "overrideTitle",
                      refTitle: "item.title",
                      customLink: "customLink",
                    },
                    prepare(selection) {
                      const { title, refTitle, customLink, overrideTitle } =
                        selection
                      let displayTitle =
                        overrideTitle ||
                        title ||
                        refTitle ||
                        customLink ||
                        "Submenu Item"
                      let subtitle = customLink
                        ? "Custom Link"
                        : refTitle
                        ? "Linked Page/Post"
                        : ""
                      return {
                        title: displayTitle,
                        subtitle,
                      }
                    },
                  },
                },
              ],
              description: "Optional submenu items for this menu item",
            },
            {
              name: "openInNewTab",
              type: "boolean",
              title: "Open in new tab",
              description:
                "If checked, the link will open in a new browser tab.",
              initialValue: false,
            },
            {
              name: "route",
              type: "string",
              title: "App Router Path",
              description:
                "Specify the relative path for App Router pages (e.g., /about, /contact). Overrides other links if set.",
            },
          ],
          preview: {
            select: {
              title: "item.title",
              submenu: "submenu",
              overrideTitle: "overrideTitle",
            },
            prepare(selection) {
              const { title, submenu, overrideTitle } = selection
              const submenuCount = submenu ? submenu.length : 0
              return {
                title: overrideTitle || title || "Menu Item",
                subtitle:
                  submenuCount > 0
                    ? `${submenuCount} submenu item(s)`
                    : "No submenu",
              }
            },
          },
        },
      ],
    }),
    defineField({
      title: "Footer Navigation",
      name: "footerNav",
      description: "Select pages for the footer menu",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            {
              name: "item",
              type: "reference",
              to: [{ type: "page" }, { type: "post" }],
              title: "Menu Item",
            },
            {
              name: "customLink",
              type: "url",
              title: "Custom Link",
              description:
                "Use this for external or custom URLs. If set, overrides Menu Item.",
            },
            {
              name: "overrideTitle",
              type: "string",
              title: "Override Title",
              description:
                "Optional: Use this to override the page or post title in the navigation.",
            },
            {
              name: "submenu",
              title: "Submenu",
              type: "array",
              of: [
                {
                  type: "reference",
                  to: [{ type: "page" }, { type: "post" }],
                  title: "Submenu Item",
                },
              ],
              description: "Optional submenu items for this menu item",
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
              title: "item.title",
              submenu: "submenu",
              overrideTitle: "overrideTitle",
            },
            prepare(selection) {
              const { title, submenu, overrideTitle } = selection
              const submenuCount = submenu ? submenu.length : 0
              return {
                title: overrideTitle || title || "Menu Item",
                subtitle:
                  submenuCount > 0
                    ? `${submenuCount} submenu item(s)`
                    : "No submenu",
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
        title: "Navigation",
      }
    },
  },
})
