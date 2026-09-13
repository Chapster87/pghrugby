import { ResultOf } from "@/lib/datocms/graphql"
import { fileFieldFragment } from "@fragments/blocks"

export type FileField = ResultOf<typeof fileFieldFragment>

/**
 * Type guard to check if an object is a DatoCMS FileField.
 * @param obj The object to check.
 * @returns True if the object is a FileField, false otherwise.
 */
export function isFileField(obj: any): obj is FileField {
  return typeof obj === "object" && obj !== null && "url" in obj && "id" in obj
}
