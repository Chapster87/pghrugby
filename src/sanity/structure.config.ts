import {
  BlockContentIcon,
  CalendarIcon,
  ComposeIcon,
  CogIcon,
  DocumentsIcon,
  FilterIcon,
  PackageIcon,
  StarIcon,
  TagIcon,
  UserIcon,
  UsersIcon,
} from "@sanity/icons"
import type { StructureBuilder, StructureResolver } from "sanity/structure"
import pluralize from "pluralize-esm"

/**
 * Structure builder is useful whenever you want to control how documents are grouped and
 * listed in the studio or for adding additional in-studio previews or content to documents.
 * Learn more: https://www.sanity.io/docs/structure-builder-introduction
 */

const DISABLED_TYPES = [
  "settings",
  "navigation",
  "assist.instruction.context",
  "product",
  "formType",
  "page",
  "post",
  "event",
  "author",
  "category",
  "tag",
  "match",
  "team",
  "league",
  "division",
]

export const structure: StructureResolver = (S: StructureBuilder) =>
  S.list()
    .title("Site Management")
    .items([
      S.listItem()
        .title("Content")
        .icon(BlockContentIcon)
        .child(
          S.list()
            .title("Content")
            .items([
              S.documentTypeListItem("page").title("Pages").icon(DocumentsIcon),
              S.documentTypeListItem("post").title("Posts").icon(ComposeIcon),
              S.divider(),
              S.documentTypeListItem("author").title("Authors").icon(UserIcon),
              S.documentTypeListItem("category")
                .title("Categories")
                .icon(FilterIcon),
              S.documentTypeListItem("tag").title("Tags").icon(TagIcon),
            ])
        ),
      S.listItem()
        .title("Products")
        .icon(PackageIcon)
        .child(
          S.list()
            .title("Products")
            .items([
              S.documentTypeListItem("product")
                .title("Product Pages")
                .icon(DocumentsIcon),
              S.documentTypeListItem("formType")
                .title("Forms")
                .icon(ComposeIcon),
            ])
        ),
      S.listItem()
        .title("Competition")
        .icon(StarIcon)
        .child(
          S.list()
            .title("Competition")
            .items([
              S.documentTypeListItem("match")
                .title("Matches")
                .icon(CalendarIcon),
              S.documentTypeListItem("team").title("Teams").icon(UsersIcon),
              S.documentTypeListItem("league").title("Leagues"),
              S.documentTypeListItem("division").title("Divisions"),
            ])
        ),
      S.divider(),
      S.listItem()
        .title("Settings")
        .icon(CogIcon)
        .child(
          S.list()
            .title("Settings")
            .items([
              S.listItem()
                .title("Site Settings")
                .child(
                  S.document().schemaType("settings").documentId("siteSettings")
                )
                .icon(CogIcon),
              S.divider(),
              S.listItem()
                .title("Navigation Settings")
                .child(
                  S.document()
                    .schemaType("navigation")
                    .documentId("navigationSettings")
                )
                .icon(DocumentsIcon),
            ])
        ),
      // The rest of the document types, filtered to exclude what we've manually placed
      ...S.documentTypeListItems()
        .filter((listItem: any) => !DISABLED_TYPES.includes(listItem.getId()))
        .map((listItem) => {
          return listItem.title(pluralize(listItem.getTitle() as string))
        }),
    ])
