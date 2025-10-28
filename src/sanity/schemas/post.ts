import { ComposeIcon } from "@sanity/icons"
import { defineField, defineType } from "sanity"

export const post = defineType({
  name: "post",
  title: "Post",
  type: "document",
  icon: ComposeIcon,
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
      name: "metadata",
      title: "SEO & Metadata",
    },
  ],
  fields: [
    defineField({ name: "title", type: "string", group: "content" }),
    defineField({ name: "slug", type: "slug", group: "content" }),
    defineField({
      name: "date",
      title: "Publish Date",
      type: "datetime",
      group: "content",
    }),
    defineField({
      name: "modified",
      title: "Last Modified",
      type: "datetime",
      description: "Date and time the page was last modified.",
      readOnly: true, // This makes the field read-only in the Studio UI
      // Field will be updated automatically on publish via a custom document action
      group: "content",
    }),
    defineField({
      name: "status",
      type: "string",
      options: {
        list: [
          { title: "Published", value: "publish" },
          { title: "Future", value: "future" },
          { title: "Draft", value: "draft" },
          { title: "Pending", value: "pending" },
          { title: "Private", value: "private" },
          { title: "Trash", value: "trash" },
          { title: "Auto-Draft", value: "auto-draft" },
          { title: "Inherit", value: "inherit" },
        ],
      },
      group: "content",
    }),
    defineField({
      name: "content",
      type: "portableText",
      group: "content",
    }),
    defineField({
      name: "excerpt",
      type: "portableText",
      group: "content",
    }),
    defineField({ name: "featuredMedia", type: "image", group: "content" }),
    defineField({ name: "sticky", type: "boolean", group: "content" }),
    defineField({
      name: "author",
      type: "reference",
      to: [{ type: "author" }],
      group: "content",
    }),
    defineField({
      name: "categories",
      type: "array",
      of: [{ type: "reference", to: [{ type: "category" }] }],
      group: "content",
    }),
    defineField({
      name: "tags",
      type: "array",
      of: [{ type: "reference", to: [{ type: "tag" }] }],
      group: "content",
    }),
    defineField({
      name: "excludeFromHomepageSlider",
      title: "Exclude from Homepage Slider",
      type: "boolean",
      description:
        "If checked, this page will not appear in the homepage slider.",
      group: "content",
      initialValue: false,
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
      slug: "slug.current",
      media: "featuredMedia",
    },
    prepare(selection) {
      const { title, slug } = selection
      return {
        title,
        subtitle: `/${slug}`,
        media: selection.media,
      }
    },
  },
})
