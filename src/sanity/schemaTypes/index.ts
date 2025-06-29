import { SchemaPluginOptions } from "sanity"
import productSchema from "./documents/product"
import settingsSchema from "./singletons/settings"
import navigationSchema from "./singletons/navigation"
import { authorType } from "./authorType"
import { blockGroupType } from "./blockGroupType"
import { categoryType } from "./categoryType"
import { columnsType } from "./columnsType"
import { columnType } from "./columnType"
import { imageWithCaptionType } from "./imageWithCaptionType"
import { mediaTextType } from "./mediaTextType"
import { pageType } from "./pageType"
import { postType } from "./postType"
import { tagType } from "./tagType"
import { portableTextType } from "./portableTextType"
import { buttonBlockType } from "./buttonBlockType"
import { buttonGroupType } from "./buttonGroupType"
import formType from "./formType"
import formFieldType from "./formFieldType"

export const schema: SchemaPluginOptions = {
  types: [
    authorType,
    blockGroupType,
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
    navigationSchema,
    buttonBlockType,
    buttonGroupType,
    formType,
    formFieldType,
  ],
  templates: (templates) =>
    templates.filter((template) => template.schemaType !== "product"),
}
