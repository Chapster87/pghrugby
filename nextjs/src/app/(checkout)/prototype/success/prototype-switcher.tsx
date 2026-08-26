"use client"

/**
 * PROTOTYPE — floating switcher for the /prototype/success return-page
 * variants. Cycles layout variants with the arrow buttons or ←/→ keys and
 * selects the (session, payment) state from the dropdown. The URL carries both
 * (`?variant=A&state=processing`) so a state is shareable and reload-stable.
 *
 * Throwaway — deleted with the prototype route.
 */

import { useCallback, useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { ORDER_STATES, STATE_VIEW } from "./variants"

import s from "./styles.module.css"

const VARIANTS = ["A", "B", "C"] as const

const VARIANT_NAMES: Record<(typeof VARIANTS)[number], string> = {
  A: "Receipt",
  B: "Status hero",
  C: "Stepper",
}

export function PrototypeSwitcher({
  variant,
  state,
}: {
  variant: string
  state: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(searchParams.toString())
      next.set(key, value)
      router.replace(`${pathname}?${next.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const cycle = useCallback(
    (dir: 1 | -1) => {
      const idx = VARIANTS.indexOf(variant as (typeof VARIANTS)[number])
      const next = VARIANTS[(idx + dir + VARIANTS.length) % VARIANTS.length]
      setParam("variant", next)
    },
    [setParam, variant]
  )

  // ← / → cycle variants; ignore when a control has focus (e.g. the state select).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault()
        cycle(-1)
      } else if (event.key === "ArrowRight") {
        event.preventDefault()
        cycle(1)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [cycle])

  const isKnown = (VARIANTS as readonly string[]).includes(variant)
  const currentVariant = (isKnown ? variant : "A") as (typeof VARIANTS)[number]

  return (
    <div className={s.bar} role="group" aria-label="Prototype controls">
      <button
        type="button"
        className={s.barArrow}
        aria-label="Previous variant"
        onClick={() => cycle(-1)}
      >
        ←
      </button>
      <span className={s.barLabel}>
        {currentVariant} — {VARIANT_NAMES[currentVariant]}
      </span>
      <button
        type="button"
        className={s.barArrow}
        aria-label="Next variant"
        onClick={() => cycle(1)}
      >
        →
      </button>
      <span className={s.barDivider} aria-hidden="true" />
      <label className={s.barField}>
        state
        <select
          className={s.barSelect}
          value={state}
          onChange={(event) => setParam("state", event.target.value)}
        >
          {ORDER_STATES.map((key) => (
            <option key={key} value={key}>
              {STATE_VIEW[key].label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
