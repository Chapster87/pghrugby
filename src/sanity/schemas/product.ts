import { ComposeIcon } from "@sanity/icons"
import { defineField, defineType } from "sanity"

export const product = defineType({
  name: "product",
  title: "Product Page",
  type: "document",
  groups: [
    {
      default: false,
      icon: ComposeIcon,
      name: "content",
      title: "Content",
    },
  ],
  fields: [
    defineField({
      name: "title",
      type: "string",
    }),
    defineField({
      name: "slug",
      type: "slug",
      readOnly: true,
    }),
    defineField({
      name: "description",
      type: "text",
      description: "A brief description of the product.",
    }),
    defineField({
      group: "content",
      name: "specs",
      type: "array",
      of: [
        {
          name: "spec",
          type: "object",
          fields: [
            { name: "lang", title: "Language", type: "string" },
            { name: "title", title: "Title", type: "string" },
            {
              name: "content",
              rows: 3,
              title: "Content",
              type: "text",
            },
          ],
        },
      ],
    }),
    defineField({
      name: "addons",
      type: "object",
      fields: [
        { name: "title", title: "Title", type: "string" },
        {
          name: "products",
          title: "Addons",
          type: "array",
          of: [{ type: "reference", to: [{ type: "product" }] }],
          validation: (Rule) => Rule.max(3),
        },
      ],
    }),
    defineField({
      name: "form",
      title: "Form",
      type: "reference",
      to: [{ type: "formType" }],
      description: "Attach a form to this product (optional)",
    }),
    defineField({
      name: "seo",
      title: "SEO Metadata",
      type: "seo",
    }),
  ],
  preview: {
    select: {
      title: "title",
    },
  },
})
