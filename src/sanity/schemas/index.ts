import { SchemaPluginOptions } from "sanity"
import { author } from "./author"
import { blockGroup } from "./components/blockGroup"
import { buttonBlock } from "./components/buttonBlock"
import { buttonGroup } from "./components/buttonGroup"
import { column, columns } from "./components/columns"
import { formField } from "./components/formField"
import { imageWithCaption } from "./components/imageWithCaption"
import { mediaText } from "./components/mediaText"
import { portableText } from "./components/portableText"
import { calendar } from "./calendar"
import { category } from "./category"
import { division } from "./division"
import { form } from "./form"
import { league } from "./league"
import { match } from "./match"
import { navigation } from "./navigation"
import { page } from "./page"
import { post } from "./post"
import { product } from "./product"
import { settings } from "./settings"
import { sponsor } from "./sponsor"
import { sponsorBar } from "./sponsorBar"
import { tag } from "./tag"
import { team } from "./team"

export const schema: SchemaPluginOptions = {
  types: [
    author,
    blockGroup,
    buttonBlock,
    buttonGroup,
    calendar,
    category,
    column,
    columns,
    division,
    form,
    formField,
    imageWithCaption,
    league,
    match,
    mediaText,
    navigation,
    page,
    portableText,
    post,
    product,
    settings,
    sponsor,
    sponsorBar,
    tag,
    team,
  ],
  templates: (templates) =>
    templates.filter((template) => template.schemaType !== "product"),
}
