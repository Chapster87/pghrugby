import { SchemaPluginOptions } from "sanity"
import { author } from "./author"
import { blockGroup } from "./components/blockGroup"
import { buttonBlock } from "./components/buttonBlock"
import { buttonGroup } from "./components/buttonGroup"
import { category } from "./category"
import { column, columns } from "./components/columns"
import { formField } from "./components/formField"
import { heading } from "./components/heading"
import { homepage } from "./pages/homepage"
import { imageWithCaption } from "./components/imageWithCaption"
import { link } from "./components/link"
import { linkGroup } from "./components/linkGroup"
import { mediaText } from "./components/mediaText"
import { membership } from "./pages/membership"
import { page } from "./page"
import { pageBuilder } from "./components/pageBuilder"
import { portableText } from "./components/portableText"
import { post } from "./post"
import { richText } from "./components/richText"
import { seo } from "./seo"
import { tag } from "./tag"

export const schema: SchemaPluginOptions = {
  types: [
    author,
    blockGroup,
    buttonBlock,
    buttonGroup,
    category,
    column,
    columns,
    formField,
    heading,
    homepage,
    imageWithCaption,
    link,
    linkGroup,
    mediaText,
    membership,
    page,
    pageBuilder,
    portableText,
    post,
    richText,
    seo,
    tag,
  ],
}
