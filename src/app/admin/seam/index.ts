/**
 * The consumer extension/add-on seam (see `docs/SEAM.md`).
 *
 * Core's seam surface: an empty consumer registry plus `registerFieldType` for
 * a host/demo-owned registry module — living outside the core subtree — to
 * populate. Core never imports consumer/demo code.
 */
export {
  registerFieldType,
  getFieldTypePlugins,
  getFieldTypePlugin,
} from "./consumer-registry"
export type {
  FieldTypePlugin,
  ConsumerFieldCategory,
  ConsumerFieldDbType,
} from "./types"
export {
  registerClientMediaProvider,
  registerServerMediaProvider,
  getActiveClientMediaProvider,
  getActiveServerMediaProvider,
  getActiveMediaProviderId,
} from "./media-provider"
export type { ClientMediaProvider, MediaServerProvider } from "./media-provider"
