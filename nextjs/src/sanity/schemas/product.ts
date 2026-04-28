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
    {
      default: false,
      icon: ComposeIcon,
      name: "forms",
      title: "Forms",
    },
    {
      default: false,
      icon: ComposeIcon,
      name: "metadata",
      title: "SEO & Metadata",
    },
  ],
  fields: [
    defineField({
      name: "title",
      type: "string",
      group: "content",
    }),
    defineField({
      name: "slug",
      type: "slug",
      readOnly: true,
      group: "content",
    }),
    defineField({
      name: "description",
      type: "text",
      description: "A brief description of the product.",
      group: "content",
    }),
    defineField({
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
      group: "content",
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
      group: "content",
    }),
    defineField({
      name: "form",
      title: "Form",
      type: "reference",
      group: "forms",
      to: [{ type: "formType" }],
      description: "Attach a form to this product (optional)",
    }),
    defineField({
      name: "seo",
      title: "SEO Metadata",
      type: "seo",
      group: "metadata",
    }),
  ],
  preview: {
    select: {
      title: "title",
    },
  },
})
