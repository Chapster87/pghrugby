import { SchemaPluginOptions } from "sanity"
import productSchema from "./documents/product"
import settingsSchema from "./singletons/settings"
import { authorType } from "./authorType"
import { categoryType } from "./categoryType"
import { columnsType } from "./columnsType"
import { columnType } from "./columnType"
import { imageWithCaptionType } from "./imageWithCaptionType"
import { mediaTextType } from "./mediaTextType"
import { pageType } from "./pageType"
import { postType } from "./postType"
import { tagType } from "./tagType"
import { portableTextType } from "./portableTextType"

export const schema: SchemaPluginOptions = {
  types: [
    authorType,
    categoryType,
    columnsType,
    columnType,
    pageType,
    postType,
    tagType,
    imageWithCaptionType,
    mediaTextType,
    portableTextType,
    productSchema,
    settingsSchema,
  ],
  templates: (templates) =>
    templates.filter((template) => template.schemaType !== "product"),
}
