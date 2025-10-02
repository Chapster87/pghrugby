import type { StructureBuilder, StructureResolver } from "sanity/structure"
import {
  FaBox,
  FaBuilding,
  FaBuildingColumns,
  FaCalendarDays,
  FaFile,
  FaFilePen,
  FaFilter,
  FaFolderTree,
  FaGear,
  FaGears,
  FaImages,
  FaMedal,
  FaMoneyBill1Wave,
  FaPenToSquare,
  FaPeopleGroup,
  FaRegCircleUser,
  FaTag,
  FaUserGroup,
  FaLink,
} from "react-icons/fa6"
import pluralize from "pluralize-esm"

/**
 * Structure builder is useful whenever you want to control how documents are grouped and
 * listed in the studio or for adding additional in-studio previews or content to documents.
 * Learn more: https://www.sanity.io/docs/structure-builder-introduction
 */

const DISABLED_TYPES = [
  "assist.instruction.context",
  "author",
  "category",
  "division",
  "event",
  "formType",
  "league",
  "linktree",
  "match",
  "media.tag",
  "navigation",
  "page",
  "post",
  "product",
  "season",
  "settings",
  "sponsor",
  "sponsorBar",
  "standings",
  "tag",
  "team",
]

export const structure: StructureResolver = (S: StructureBuilder) =>
  S.list()
    .title("Site Management")
    .items([
      S.listItem()
        .title("Navigation")
        .icon(FaFolderTree)
        .child(
          S.document().schemaType("navigation").documentId("navigationSettings")
        ),
      S.listItem()
        .title("Content")
        .icon(FaFilePen)
        .child(
          S.list()
            .title("Content")
            .items([
              S.documentTypeListItem("page").title("Pages").icon(FaFile),
              S.documentTypeListItem("post").title("Posts").icon(FaPenToSquare),
              S.divider(),
              S.documentTypeListItem("author")
                .title("Authors")
                .icon(FaRegCircleUser),
              S.documentTypeListItem("category")
                .title("Categories")
                .icon(FaFilter),
              S.documentTypeListItem("tag").title("Tags").icon(FaTag),
            ])
        ),
      S.listItem()
        .title("Products")
        .icon(FaBox)
        .child(
          S.list()
            .title("Products")
            .items([
              S.documentTypeListItem("product")
                .title("Product Pages")
                .icon(FaFile),
              S.documentTypeListItem("formType")
                .title("Forms")
                .icon(FaPenToSquare),
            ])
        ),
      S.listItem()
        .title("Competition")
        .icon(FaMedal)
        .child(
          S.list()
            .title("Competition")
            .items([
              S.documentTypeListItem("match")
                .title("Matches")
                .icon(FaCalendarDays),
              S.documentTypeListItem("standings")
                .title("Standings")
                .icon(FaMedal),
              S.documentTypeListItem("team").title("Teams").icon(FaPeopleGroup),
              S.documentTypeListItem("league")
                .title("Leagues")
                .icon(FaBuildingColumns),
              S.documentTypeListItem("division")
                .title("Divisions")
                .icon(FaBuilding),
              S.documentTypeListItem("season") // Added season schema
                .title("Seasons")
                .icon(FaCalendarDays),
            ])
        ),
      S.listItem()
        .title("Sponsorship")
        .icon(FaMoneyBill1Wave)
        .child(
          S.list()
            .title("Sponsorship")
            .items([
              S.documentTypeListItem("sponsor")
                .title("Sponsors")
                .icon(FaUserGroup),
              S.listItem()
                .title("Sponsor Bar")
                .icon(FaImages)
                .child(
                  S.document().schemaType("sponsorBar").documentId("sponsorBar")
                ),
            ])
        ),
      S.listItem()
        .title("Media Tags") // Changed Media Tags to a list with grouped items
        .icon(FaTag)
        .child(
          S.list()
            .title("Media Tags")
            .items([
              S.documentTypeListItem("media.tag")
                .title("Media Tags")
                .icon(FaTag),
            ])
        ),
      S.listItem()
        .title("Link Tree")
        .icon(FaLink)
        .child(
          S.document().schemaType("linktree").documentId("linkTreeSettings")
        ),
      S.divider(),
      S.listItem()
        .title("Settings")
        .icon(FaGears)
        .child(
          S.list()
            .title("Settings")
            .items([
              S.listItem()
                .title("Site Settings")
                .child(
                  S.document().schemaType("settings").documentId("siteSettings")
                )
                .icon(FaGear),
              S.divider(),
            ])
        ),
      // The rest of the document types, filtered to exclude what we've manually placed
      ...S.documentTypeListItems()
        .filter((listItem: any) => !DISABLED_TYPES.includes(listItem.getId()))
        .map((listItem) => {
          return listItem.title(pluralize(listItem.getTitle() as string))
        }),
    ])
