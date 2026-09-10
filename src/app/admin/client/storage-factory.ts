import { getActiveClientMediaProvider } from "../seam/media-provider"
import type { StorageAdapter } from "./media-service"

/**
 * Factory for retrieving the active storage adapter.
 *
 * The adapter is the client half of the media storage-provider seam: a concrete
 * provider (Cloudinary, Supabase storage, local…) is example/consumer code that
 * registers into core's media seam. Core's storage factory only ever asks the
 * seam which provider is active and returns that provider's adapter — it ships
 * no adapter itself and hardcodes no provider.
 */
export const storageFactory = {
  getAdapter(): StorageAdapter {
    const provider = getActiveClientMediaProvider()
    if (!provider) {
      throw new Error(
        "No client media provider is registered. Register one through the " +
          "media seam (shell admin registrar) before using the media library."
      )
    }
    return provider.adapter
  },

  getProviderId(): string {
    return getActiveClientMediaProvider()?.id ?? ""
  },
}
