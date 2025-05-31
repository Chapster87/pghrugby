import { CogIcon } from "@sanity/icons"
import { defineArrayMember, defineField, defineType } from "sanity"

// import * as demo from "../../lib/initialValues"
// Fallback initial values if the module is missing
const demo = {
  title: "My Blog",
  description: [
    {
      _key: "9f1a629887fd",
      _type: "block",
      children: [
        {
          _key: "4a58edd077880",
          _type: "span",
          marks: [],
          text: "A statically generated blog example using ",
        },
        {
          _key: "4a58edd077881",
          _type: "span",
          marks: ["ec5b66c9b1e0"],
          text: "Next.js",
        },
        {
          _key: "4a58edd077882",
          _type: "span",
          marks: [],
          text: " and ",
        },
        {
          _key: "4a58edd077883",
          _type: "span",
          marks: ["1f8991913ea8"],
          text: "Sanity",
        },
        {
          _key: "4a58edd077884",
          _type: "span",
          marks: [],
          text: ".",
        },
      ],
      markDefs: [
        {
          _key: "ec5b66c9b1e0",
          _type: "link",
          href: "https://nextjs.org/",
        },
        {
          _key: "1f8991913ea8",
          _type: "link",
          href: "https://sanity.io/",
        },
      ],
      ogImageTitle: "A Next.js Blog with a Native Authoring Experience",
    },
  ],
}

/**
 * Settings schema Singleton.  Singletons are single documents that are displayed not in a collection, handy for things like site settings and other global configurations.
 * Learn more: https://www.sanity.io/docs/create-a-link-to-a-single-edit-page-in-your-main-document-type-list
 */

const settingsSchema = defineType({
  name: "settings",
  title: "Settings",
  type: "document",
  icon: CogIcon,
  fields: [
    defineField({
      name: "title",
      description: "This field is the title of your blog.",
      title: "Title",
      type: "string",
      initialValue: demo.title,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "description",
      description:
        "Used both for the <meta> description tag for SEO, and the blog subheader.",
      title: "Description",
      type: "array",
      initialValue: demo.description,
      of: [
        // Define a minified block content field for the description. https://www.sanity.io/docs/block-content
        defineArrayMember({
          type: "block",
          options: {},
          styles: [],
          lists: [],
          marks: {
            decorators: [],
            annotations: [
              defineField({
                type: "object",
                name: "link",
                fields: [
                  {
                    type: "string",
                    name: "href",
                    title: "URL",
                    validation: (rule) => rule.required(),
                  },
                ],
              }),
            ],
          },
        }),
      ],
    }),
    defineField({
      name: "ogImage",
      title: "Open Graph Image",
      type: "image",
      description: "Displayed on social cards and search engine results.",
      options: {
        hotspot: true,
        aiAssist: {
          imageDescriptionField: "alt",
        },
      },
      fields: [
        defineField({
          name: "alt",
          description: "Important for accessibility and SEO.",
          title: "Alternative text",
          type: "string",
          validation: (rule) => {
            return rule.custom((alt, context) => {
              if ((context.document?.ogImage as any)?.asset?._ref && !alt) {
                return "Required"
              }
              return true
            })
          },
        }),
        defineField({
          name: "metadataBase",
          type: "url",
          description: (
            <a
              href="https://nextjs.org/docs/app/api-reference/functions/generate-metadata#metadatabase"
              rel="noreferrer noopener"
            >
              More information
            </a>
          ),
        }),
      ],
    }),
  ],
  preview: {
    prepare() {
      return {
        title: "Settings",
      }
    },
  },
})

export default settingsSchema
