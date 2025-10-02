import { SchemaPluginOptions } from "sanity"
import { author } from "./author"
import { blockGroup } from "./components/blockGroup"
import { buttonBlock } from "./components/buttonBlock"
import { buttonGroup } from "./components/buttonGroup"
import { calendar } from "./calendar"
import { category } from "./category"
import { column, columns } from "./components/columns"
import { division } from "./division"
import { form } from "./form"
import { formField } from "./components/formField"
import { imageWithCaption } from "./components/imageWithCaption"
import { league } from "./league"
import { linktree } from "./linktree"
import { match } from "./match"
import { mediaText } from "./components/mediaText"
import { navigation } from "./navigation"
import { page } from "./page"
import { portableText } from "./components/portableText"
import { post } from "./post"
import { product } from "./product"
import { season } from "./season"
import { settings } from "./settings"
import { sponsor } from "./sponsor"
import { sponsorBar } from "./sponsorBar"
import standings from "./standings"
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
    linktree,
    match,
    mediaText,
    navigation,
    page,
    portableText,
    post,
    product,
    season,
    settings,
    sponsor,
    sponsorBar,
    standings,
    tag,
    team,
  ],
  templates: (templates) =>
    templates.filter((template) => template.schemaType !== "product"),
}
