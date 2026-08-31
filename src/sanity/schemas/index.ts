import { SchemaPluginOptions } from "sanity"
import { author } from "./author"
import { blockGroup } from "./components/blockGroup"
import { buttonBlock } from "./components/buttonBlock"
import { buttonGroup } from "./components/buttonGroup"
import { calendar } from "./calendar"
import { category } from "./category"
import { column, columns } from "./components/columns"
import { division } from "./division"
import { formField } from "./components/formField"
import { heading } from "./components/heading"
import { homepage } from "./pages/homepage"
import { imageWithCaption } from "./components/imageWithCaption"
import { league } from "./league"
import { link } from "./components/link"
import { linkGroup } from "./components/linkGroup"
import { match } from "./match"
import { mediaText } from "./components/mediaText"
import { membership } from "./pages/membership"
import { page } from "./page"
import { pageBuilder } from "./components/pageBuilder"
import { portableText } from "./components/portableText"
import { post } from "./post"
import { richText } from "./components/richText"
import { season } from "./season"
import { seo } from "./seo"
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
    formField,
    heading,
    homepage,
    imageWithCaption,
    league,
    link,
    linkGroup,
    match,
    mediaText,
    membership,
    page,
    pageBuilder,
    portableText,
    post,
    richText,
    season,
    seo,
    standings,
    tag,
    team,
  ],
}
