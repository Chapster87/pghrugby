"use client"

import { useEffect, useSyncExternalStore } from "react"

/**
 * Resolves cart-line thumbnails for the browser-held cart.
 *
 * The cart holds only skus; the resolution reads Stripe with a server-only key,
 * so it goes through `POST /api/checkout/thumbnails`. Results land in a
 * module-lifetime cache exposed as an external store — the same idiom the cart
 * itself uses — so reopening the flyout never refetches and an unresolvable sku
 * simply has no entry, leaving the card to render its placeholder.
 *
 * @param skus - The skus currently in the cart.
 * @returns A sku → thumbnail URL map, filled in as resolutions land.
 */

/** Resolved thumbnails, keyed by sku (module-lifetime cache). */
const cache = new Map<string, string>()

/** The cached map as an immutable snapshot for `useSyncExternalStore`. */
let snapshot: Record<string, string> = {}

const EMPTY: Record<string, string> = {}

const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): Record<string, string> {
  return snapshot
}

/** Server + hydration snapshot: nothing resolved yet. */
function getServerSnapshot(): Record<string, string> {
  return EMPTY
}

/** Caches a resolved thumbnail and publishes a new snapshot. */
function remember(sku: string, url: string): void {
  cache.set(sku, url)
  snapshot = Object.fromEntries(cache)
  for (const listener of listeners) listener()
}

export function useLineThumbnails(skus: string[]): Record<string, string> {
  // A stable dependency: the caller passes a fresh array each render.
  const key = [...new Set(skus)].sort().join(",")
  const thumbnails = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )

  useEffect(() => {
    const missing = (key ? key.split(",") : []).filter((sku) => !cache.has(sku))
    if (missing.length === 0) return

    // No cleanup needed: the resolution writes to the module store, whose
    // subscribers React drops when the component unmounts.
    const resolve = async () => {
      try {
        const res = await fetch("/api/checkout/thumbnails", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ skus: missing }),
        })
        const data = (await res.json()) as { thumbnails?: unknown }
        const map = data?.thumbnails
        if (map && typeof map === "object") {
          for (const [sku, url] of Object.entries(map)) {
            if (typeof url === "string") remember(sku, url)
          }
        }
      } catch {
        // Leave them uncached: the card falls back and a later open retries.
      }
    }

    void resolve()
  }, [key])

  return thumbnails
}
