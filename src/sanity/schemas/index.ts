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
import { heading } from "./components/heading"
import { homepage } from "./homepage"
import { imageWithCaption } from "./components/imageWithCaption"
import { league } from "./league"
import { link } from "./components/link"
import { linkGroup } from "./components/linkGroup"
import { linktree } from "./linktree"
import { match } from "./match"
import { mediaText } from "./components/mediaText"
import { navigation } from "./navigation"
import { page } from "./page"
import { pageBuilder } from "./components/pageBuilder"
import { portableText } from "./components/portableText"
import { post } from "./post"
import { product } from "./product"
import { richText } from "./components/richText"
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
    heading,
    homepage,
    imageWithCaption,
    league,
    link,
    linkGroup,
    linktree,
    match,
    mediaText,
    navigation,
    page,
    pageBuilder,
    portableText,
    post,
    product,
    richText,
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
