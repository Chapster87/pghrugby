/**
 * Single source of truth for CMS object type names.
 *
 * Names derive from unique, stable technical ids — a block's `api_id`, a
 * model's `slug` — never from display labels (`label`, `friendly_name`), which
 * are not unique. Deriving from the ids makes the names unique by construction
 * instead of something the schema has to police.
 *
 * Shared by the CDA schema generator (`CDACore`) and the TypeScript type
 * generator (`scripts/sync-types.ts`) so the two naming schemes cannot drift.
 */

/**
 * Pascal-cases a technical id. Non-alphanumerics become word boundaries, each
 * word is title-cased, and a leading digit is escaped so the result is a valid
 * GraphQL / TypeScript identifier.
 */
export function toPascalCase(value: string): string {
  return value
    .replace(/[^a-zA-Z0-9]/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("")
    .replace(/^[0-9]/, "M_")
}

/**
 * The type name root for a block, from its unique `api_id`.
 *
 * GraphQL alone appends the "Block" suffix (`HeroBlock` + `Block`); the
 * TypeScript generator uses this root as-is.
 */
export function blockName(block: { api_id: string }): string {
  return toPascalCase(block.api_id)
}

/**
 * The type name for a model, from its unique `slug` (falling back to
 * `table_name`). Used verbatim by both GraphQL and TypeScript.
 */
export function modelName(model: {
  slug?: string | null
  table_name: string
}): string {
  return toPascalCase(model.slug || model.table_name)
}
