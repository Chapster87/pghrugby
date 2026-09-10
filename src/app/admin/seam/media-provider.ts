import type { StorageAdapter } from "../client/media-service"
import { coreConfig } from "../lib/core-config"

/**
 * Media storage-provider seam (see `docs/SEAM.md`).
 *
 * The media library is provider-agnostic on the client (a `StorageAdapter`) and
 * on the server (the four `api/media/*` routes). Like field types, a concrete
 * provider is consumer/example code that registers *into* this seam: it ships
 * no provider of its own. Core consults whichever provider the host registered,
 * resolved against `coreConfig.media.provider` (or, when that is unset, the
 * single registered provider — which is how the standalone demo dogfoods).
 *
 * Registration is deliberately split by runtime because the two halves live in
 * different module graphs:
 *
 * - **Client** providers (upload adapter + media-library browser) are registered
 *   by the shell's admin-layout registrar, exactly like field-type plugins.
 * - **Server** providers (the route-handler implementations behind
 *   `api/media/*`) are registered at process boot by shell-owned
 *   `instrumentation.ts`, because Next route handlers are not wrapped by a page
 *   layout and therefore cannot rely on a layout import to populate a registry
 *   before a route runs.
 */

/** The server surface the four `api/media/*` routes delegate to. */
export interface MediaServerProvider {
  /** Provider id, e.g. `"cloudinary"`. Stored on `media_assets.storage_provider`. */
  id: string
  /** POST /api/media/sign — sign a client upload. */
  sign(request: Request): Promise<Response>
  /** POST /api/media/sign-library — sign the provider's media-library widget. */
  signLibrary(request: Request): Promise<Response>
  /** POST /api/media/fetch-metadata — metadata for an existing asset by URL. */
  fetchMetadata(request: Request): Promise<Response>
  /** POST /api/media/sync — reconcile the local registry with the provider. */
  sync(request: Request): Promise<Response>
}

/** The client surface the media UI consumes for a provider. */
export interface ClientMediaProvider {
  /** Provider id, e.g. `"cloudinary"`. */
  id: string
  /** Upload/delete/signed-url adapter (core's `StorageAdapter` contract). */
  adapter: StorageAdapter
  /**
   * Label for the "browse the provider's existing library" affordance. Only
   * surfaced when `openLibrary` is provided.
   */
  label: string
  /**
   * Opens the provider's own media-library browser. Calls `onInserted` after
   * chosen assets are registered with the CMS. Omit when the provider has no
   * browser to surface.
   */
  openLibrary?: (onInserted?: () => void) => void
}

const serverRegistry = new Map<string, MediaServerProvider>()
const clientRegistry = new Map<string, ClientMediaProvider>()

/** Register a server media provider (called at process boot by the shell). */
export function registerServerMediaProvider(
  provider: MediaServerProvider
): void {
  if (serverRegistry.has(provider.id)) {
    throw new Error(
      `registerServerMediaProvider: a provider "${provider.id}" is already registered.`
    )
  }
  serverRegistry.set(provider.id, provider)
}

/** Register a client media provider (called by the shell's admin registrar). */
export function registerClientMediaProvider(provider: ClientMediaProvider): void {
  if (clientRegistry.has(provider.id)) {
    throw new Error(
      `registerClientMediaProvider: a provider "${provider.id}" is already registered.`
    )
  }
  clientRegistry.set(provider.id, provider)
}

/** The client media provider the UI should use, if any is registered. */
export function getActiveClientMediaProvider(): ClientMediaProvider | undefined {
  return resolveActive(clientRegistry)
}

/** The server media provider the `api/media/*` routes delegate to. */
export function getActiveServerMediaProvider(): MediaServerProvider {
  const provider = resolveActive(serverRegistry)
  if (!provider) {
    throw new Error(
      "No server media provider is registered. Register one at process boot " +
        "(shell-owned instrumentation.ts) or set NEXT_PUBLIC_CMS_MEDIA_PROVIDER."
    )
  }
  return provider
}

/** The configured/effective provider id, used by `mediaService` dedupe. */
export function getActiveMediaProviderId(): string {
  return getActiveClientMediaProvider()?.id ?? coreConfig.media.provider
}

function resolveActive<T extends { id: string }>(
  registry: Map<string, T>
): T | undefined {
  const configured = coreConfig.media.provider
  if (configured) {
    return registry.get(configured)
  }
  // Unconfigured but exactly one registered provider: the demo dogfoods this way.
  if (registry.size === 1) {
    return [...registry.values()][0]
  }
  return undefined
}
