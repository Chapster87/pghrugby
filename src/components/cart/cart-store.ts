"use client"

import { parseCartEntries, type CartEntry } from "@/lib/checkout/cart-entries"
import {
  addGroup,
  removeEntry,
  saveCollectorEntry,
  setEntryQuantity,
  type CartAddGroup,
} from "@/lib/checkout/cart-mutations"

/**
 * The browser-held cart as an **external store**.
 *
 * The cart is state React does not own: it is written by any PDP, read by the
 * header and the flyout, persisted to `localStorage`, and must survive a reload.
 * Modelling it as an external store is what makes that honest — components
 * subscribe with `useSyncExternalStore` instead of hydrating through a
 * state-setting effect, so the server render, the hydration render, and the
 * first live render can never disagree.
 *
 * `EMPTY` is the server snapshot (and the hydration render), which is why the
 * header badge appears a tick after hydration rather than risking a mismatch.
 *
 * See `docs/pdp-to-minicart-to-checkout-spec.md` § 6.1.
 */

/** The persisted shape. Versioned so a reshape can drop stale entries. */
const STORAGE_KEY = "pghrugby.cart.v1"

export type CartState = {
  /** The `client_reference_id` the checkout snapshot is keyed by. */
  cartRef: string
  /** The cart's flat entry list, in add order. */
  entries: CartEntry[]
  /**
   * The promotion code the buyer entered in the flyout, if any. Display state
   * only — the session build resolves it against Stripe and decides whether it
   * applies (`src/lib/checkout/sc7s-discount.ts`).
   */
  promotionCode: string
}

/** The server + hydration snapshot: always an empty cart. */
const EMPTY: CartState = { cartRef: "", entries: [], promotionCode: "" }

let state: CartState | null = null
const listeners = new Set<() => void>()

/** The new `cartRef` for a fresh browser cart. */
function newCartRef(): string {
  return crypto.randomUUID()
}

/**
 * Reads the stored cart, discarding anything unexpected — a truncated write, a
 * non-array, a missing ref — in favour of a fresh empty cart rather than
 * crashing every page behind the provider.
 */
function readStorage(): CartState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as {
        cartRef?: unknown
        entries?: unknown
        promotionCode?: unknown
      }
      if (typeof parsed?.cartRef === "string" && parsed.cartRef) {
        return {
          cartRef: parsed.cartRef,
          entries: parseCartEntries(parsed.entries),
          promotionCode:
            typeof parsed.promotionCode === "string"
              ? parsed.promotionCode
              : "",
        }
      }
    }
  } catch {
    // Unavailable or corrupt storage: start clean.
  }
  return { cartRef: newCartRef(), entries: [], promotionCode: "" }
}

/** The current cart; the browser's stored cart on its first client read. */
export function getCartSnapshot(): CartState {
  state ??= readStorage()
  return state
}

/** The snapshot React renders before it can read the browser. */
export function getCartServerSnapshot(): CartState {
  return EMPTY
}

/** Subscribes a component to cart changes. */
export function subscribeToCart(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Applies a mutation, persists it, and notifies subscribers. Persistence is
 * per-write rather than debounced so a reload mid-session can never lose an add.
 */
function commit(mutate: (prev: CartState) => CartState): void {
  const next = mutate(getCartSnapshot())
  state = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // A full or unavailable store must not break the cart in this tab.
  }
  for (const listener of listeners) listener()
}

/**
 * The cart's mutations — the store's write side, used by the provider's actions
 * and by nothing else.
 */
export const cartStore = {
  /**
   * Commits an add-to-cart action, applying the merge and cascade rules.
   *
   * @param group - The PDP's primaries, add-ons, and collector payload.
   * @param sourcePdp - The PDP slug the action came from.
   */
  add(group: CartAddGroup, sourcePdp: string): void {
    commit((prev) => ({
      ...prev,
      entries: addGroup(prev.entries, group, { sourcePdp }),
    }))
  },

  /** Writes a line's buyer-set quantity (floored at 1). */
  setQuantity(id: string, quantity: number): void {
    commit((prev) => ({
      ...prev,
      entries: setEntryQuantity(prev.entries, id, quantity),
    }))
  },

  /** Removes an entry, cascading to its add-ons and collector entry. */
  remove(id: string): void {
    commit((prev) => ({ ...prev, entries: removeEntry(prev.entries, id) }))
  },

  /** Writes a registration's answers and its primary line's quantity together. */
  saveCollector(
    collectorId: string,
    answers: Record<string, unknown>,
    quantity: number
  ): void {
    commit((prev) => ({
      ...prev,
      entries: saveCollectorEntry(prev.entries, collectorId, answers, quantity),
    }))
  },

  /**
   * Writes the buyer-entered promotion code (trimmed); an empty string clears
   * it. Never validated here — the session build is the authority.
   */
  setPromotionCode(code: string): void {
    commit((prev) => ({ ...prev, promotionCode: code.trim() }))
  },
}
