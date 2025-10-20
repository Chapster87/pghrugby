import { defineType } from "sanity"
import { FaAlignLeft, FaAlignCenter, FaAlignRight } from "react-icons/fa6"
import { TextAlign } from "@/sanity/components/TextAlign"

export const richText = defineType({
  name: "richText",
  title: "Rich Text Block",
  type: "object",
  fields: [
    {
      name: "content",
      title: "Content",
      type: "array",
      of: [
        {
          type: "block",
          marks: {
            decorators: [
              {
                title: "Bold",
                value: "strong",
              },
              {
                title: "Italic",
                value: "em",
              },
              {
                title: "Underline",
                value: "underline",
              },
              {
                title: "Strike",
                value: "strike-through",
              },
              {
                title: "Left",
                value: "left",
                icon: FaAlignLeft,
                component: (props) => TextAlign(props),
              },
              {
                title: "Center",
                value: "center",
                icon: FaAlignCenter,
                component: (props) => TextAlign(props),
              },
              {
                title: "Right",
                value: "right",
                icon: FaAlignRight,
                component: (props) => TextAlign(props),
              },
            ],
            annotations: [
              {
                name: "link",
                type: "object",
                title: "External link",

                fields: [
                  {
                    name: "href",
                    type: "url",
                    title: "URL",
                    description:
                      "The URL of the link. Include http:// or https://",
                  },
                  {
                    title: "Open in new tab",
                    name: "blank",
                    type: "boolean",
                  },
                ],
              },
              {
                name: "internalLink",
                type: "object",
                title: "Internal link",
                icon: () => "Ref",
                fields: [
                  {
                    name: "reference",
                    type: "reference",
                    title: "Reference",
                    to: [
                      { type: "page" },
                      { type: "post" },
                      { type: "product" },
                    ],
                  },
                ],
              },
              {
                type: "textColor",
              },
              {
                type: "highlightColor",
              },
            ],
          },
        },
      ],
    },
  ],
  preview: {
    select: {
      title: "content.0.children.0.text",
    },
    prepare(selection) {
      const { title } = selection
      return {
        title: "Rich Text Block",
        subtitle: title,
      }
    },
  },
})
