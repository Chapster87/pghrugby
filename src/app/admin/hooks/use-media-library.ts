"use client"

import { useCallback } from "react"
import { getActiveClientMediaProvider } from "../seam/media-provider"

/**
 * Provider-agnostic access to the active media provider's library browser.
 *
 * Core ships no media-library browser of its own — that is provider code. This
 * hook hands the media UI the registered provider's `openLibrary` (a no-op when
 * the provider exposes none) plus the provider itself, so UI can decide whether
 * to surface the "browse existing assets" affordance.
 */
export function useMediaLibrary(onInserted?: () => void) {
  const provider = getActiveClientMediaProvider()

  const openLibrary = useCallback(() => {
    provider?.openLibrary?.(onInserted)
  }, [provider, onInserted])

  return { provider, openLibrary }
}
