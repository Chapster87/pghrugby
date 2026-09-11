import type { FieldTypePlugin } from "./types"

/**
 * Core's consumer registry (see `docs/SEAM.md`).
 *
 * Core ships this registry **empty**: it exports `registerFieldType` but never
 * imports any consumer/demo plugin. A host/demo-owned registry module, living
 * outside the core subtree, imports `registerFieldType` and registers its
 * plugins here; core's record form and schema UI consult this registry as an
 * additive lookup after core's built-ins.
 *
 * This is a plain in-memory module shared across the app bundle, so a
 * registration site and its consumers must import the same module path.
 */

const consumerRegistry = new Map<string, FieldTypePlugin>()

/**
 * Register a consumer field-type plugin.
 *
 * Additive only: it never touches core's built-in field types. Each `type`
 * must be unique — re-registering a type that is already present is a
 * configuration error and throws.
 */
export function registerFieldType(plugin: FieldTypePlugin): void {
  const { type } = plugin
  if (consumerRegistry.has(type)) {
    throw new Error(
      `registerFieldType: a field type "${type}" is already registered. ` +
        "Field types must be unique across the consumer registry."
    )
  }
  const { dbType = "jsonb", ...metadata } = plugin
  consumerRegistry.set(type, { ...metadata, dbType })
}

/** All registered consumer field-type plugins (empty until a host registers any). */
export function getFieldTypePlugins(): FieldTypePlugin[] {
  return [...consumerRegistry.values()]
}

/** The consumer plugin registered for `type`, if any. */
export function getFieldTypePlugin(
  type: string
): FieldTypePlugin | undefined {
  return consumerRegistry.get(type)
}
