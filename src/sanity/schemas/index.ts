import { SchemaPluginOptions } from "sanity"
import { page } from "./page"
import { post } from "./post"
import { product } from "./product"
import { form } from "./form"
import { match } from "./match"
import { calendar } from "./calendar"
import { settings } from "./settings"
import { navigation } from "./navigation"
import { author } from "./author"
import { category } from "./category"
import { league } from "./league"
import { division } from "./division"
import { tag } from "./tag"
import { team } from "./team"
import { blockGroup } from "./components/blockGroup"
import { buttonBlock } from "./components/buttonBlock"
import { buttonGroup } from "./components/buttonGroup"
import { columns, column } from "./components/columns"
import { formField } from "./components/formField"
import { imageWithCaption } from "./components/imageWithCaption"
import { mediaText } from "./components/mediaText"
import { portableText } from "./components/portableText"

export const schema: SchemaPluginOptions = {
  types: [
    post,
    page,
    category,
    author,
    calendar,
    tag,
    product,
    settings,
    navigation,
    match,
    team,
    league,
    division,
    form,
    blockGroup,
    buttonBlock,
    buttonGroup,
    columns,
    column,
    formField,
    imageWithCaption,
    mediaText,
    portableText,
  ],
  templates: (templates) =>
    templates.filter((template) => template.schemaType !== "product"),
}
