"use client"

/**
 * PROTOTYPE switcher — throwaway. Shared by any UI prototype: a floating
 * bottom-centre bar that cycles a `?variant=` search param so a variant is
 * shareable and reload-stable.
 *
 * Hidden in production so a stray merge can never ship the bar to users.
 */

import { useCallback, useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import s from "./style.module.css"

export type VariantInfo = {
  /** Short key shown in the bar, e.g. "B". */
  key: string
  /** Human name, e.g. "Image-less typographic cards". */
  name: string
}

export default function PrototypeSwitcher({
  variants,
  current,
}: {
  variants: VariantInfo[]
  current: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const go = useCallback(
    (key: string) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("variant", key)
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const idx = Math.max(
    0,
    variants.findIndex((v) => v.key === current)
  )

  const next = useCallback(
    () => go(variants[(idx + 1) % variants.length].key),
    [go, idx, variants]
  )
  const prev = useCallback(
    () => go(variants[(idx - 1 + variants.length) % variants.length].key),
    [go, idx, variants]
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return
      }
      if (event.key === "ArrowRight") next()
      if (event.key === "ArrowLeft") prev()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [next, prev])

  if (process.env.NODE_ENV === "production") return null

  const active = variants[idx] ?? variants[0]

  return (
    <div className={s.switcherBar} role="group" aria-label="Prototype switcher">
      <button
        type="button"
        className={s.switcherBtn}
        onClick={prev}
        aria-label="Previous variant"
      >
        ‹
      </button>
      <span className={s.switcherLabel}>
        <b>{active.key}</b> — {active.name}
      </span>
      <button
        type="button"
        className={s.switcherBtn}
        onClick={next}
        aria-label="Next variant"
      >
        ›
      </button>
    </div>
  )
}
