"use client"

import { useEffect, useSyncExternalStore } from "react"

import type { LineDisplay } from "@/lib/checkout/cart-display"

/**
 * Resolves display pricing for the browser-held cart.
 *
 * The cart holds only skus, and a sale amount lives in Stripe behind a
 * server-only key, so the resolution goes through `POST /api/checkout/pricing`.
 * Results land in a module-lifetime cache exposed as an external store — the same
 * idiom the thumbnails hook uses — so reopening the flyout never refetches, and a
 * sku the server could not price is simply absent, leaving `displayFor` to fall
 * back to the catalog's regular amount.
 *
 * @param skus - The skus currently in the cart.
 * @returns A sku → display pricing map, filled in as resolutions land.
 */

/** Resolved display pricing, keyed by sku (module-lifetime cache). */
const cache = new Map<string, LineDisplay>()

/** The cached map as an immutable snapshot for `useSyncExternalStore`. */
let snapshot: Record<string, LineDisplay> = {}

const EMPTY: Record<string, LineDisplay> = {}

const listeners = new Set<() => void>()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): Record<string, LineDisplay> {
  return snapshot
}

/** Server + hydration snapshot: nothing resolved yet. */
function getServerSnapshot(): Record<string, LineDisplay> {
  return EMPTY
}

/** Caches a resolved price and publishes a new snapshot. */
function remember(sku: string, display: LineDisplay): void {
  cache.set(sku, display)
  snapshot = Object.fromEntries(cache)
  for (const listener of listeners) listener()
}

/** True when a value is shaped like `LineDisplay`. */
function isLineDisplay(value: unknown): value is LineDisplay {
  if (!value || typeof value !== "object") return false
  const display = value as { unitAmount?: unknown; compareAtAmount?: unknown }
  return (
    typeof display.unitAmount === "number" &&
    (display.compareAtAmount === null ||
      typeof display.compareAtAmount === "number")
  )
}

export function useLinePricing(skus: string[]): Record<string, LineDisplay> {
  // A stable dependency: the caller passes a fresh array each render.
  const key = [...new Set(skus)].sort().join(",")
  const pricing = useSyncExternalStore(
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
        const res = await fetch("/api/checkout/pricing", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ skus: missing }),
        })
        const data = (await res.json()) as { pricing?: unknown }
        const map = data?.pricing
        if (map && typeof map === "object") {
          for (const [sku, display] of Object.entries(map)) {
            if (isLineDisplay(display)) remember(sku, display)
          }
        }
      } catch {
        // Leave them uncached: the surface falls back and a later open retries.
      }
    }

    void resolve()
  }, [key])

  return pricing
}
