import type { ComponentType } from "react"
import type { FieldRendererProps } from "../editor/[model]/_components/record-form/types"

/**
 * Seam vocabulary for consumer field-type plugins.
 *
 * Models and fields are data (see `CONTEXT.md`); the consumer extension seam
 * exists only where consumer-authored *code* must reach the vendored core.
 * The registerable unit of that seam is a single field-type plugin bundling
 * everything a custom field type needs end-to-end. See `docs/SEAM.md`.
 */

export type ConsumerFieldDbType =
  | "text"
  | "numeric"
  | "boolean"
  | "timestamptz"
  | "jsonb"

export type ConsumerFieldCategory =
  | "basic"
  | "content"
  | "relational"
  | "advanced"

/**
 * A consumer-authored field type registered through `registerFieldType`.
 *
 * The `type` string is what is stored as a field's `field_type` and looked up
 * by the schema UI's type picker and the record form. `Editor` is the record
 * editor component handed core's `FieldRendererProps` (including
 * `getFieldValue`, so a consumer editor can read sibling fields).
 */
export interface FieldTypePlugin {
  /** The `field_type` string stored as data. */
  type: string
  /** Label shown in the schema-UI type picker. */
  label: string
  /** Human description for the schema-UI type picker. */
  description: string
  category: ConsumerFieldCategory
  /** Lucide icon name for the schema-UI type picker. */
  icon: string
  /**
   * Storage semantics driving physical column creation. Defaults to `jsonb`
   * (opaque JSON served over the CDA).
   */
  dbType?: ConsumerFieldDbType
  /** Record-editor component (a client component). */
  Editor: ComponentType<FieldRendererProps>
}
