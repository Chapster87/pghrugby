import { SchemaPluginOptions } from "sanity"
import pageSchema from "./documents/page"
import postSchema from "./documents/post"
import productSchema from "./documents/product"
import personSchema from "./documents/person"
import settingsSchema from "./singletons/settings"
import linkSchema from "./objects/link"
import callToActionSchema from "./objects/callToAction"
import infoSectionSchema from "./objects/infoSection"
import blockContentSchema from "./objects/blockContent"

export const schema: SchemaPluginOptions = {
  types: [
    pageSchema,
    postSchema,
    productSchema,
    personSchema,
    settingsSchema,
    linkSchema,
    callToActionSchema,
    infoSectionSchema,
    blockContentSchema,
  ],
  templates: (templates) =>
    templates.filter((template) => template.schemaType !== "product"),
}
