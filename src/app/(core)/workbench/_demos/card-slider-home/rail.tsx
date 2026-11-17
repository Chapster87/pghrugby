"use client"

import { useRef, type ReactNode } from "react"

import s from "./style.module.css"

/**
 * PROTOTYPE primitive — throwaway.
 *
 * A horizontally scrollable rail with prev/next buttons, shared by the variants
 * whose *design idea* is a rail. Each variant supplies its own items and width,
 * so the primitive carries only the scroll behaviour, not the look.
 */
export function Rail({
  children,
  ariaLabel,
}: {
  children: ReactNode
  ariaLabel: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  const scroll = (dir: number) => {
    const el = ref.current
    if (!el) return
    el.scrollBy({
      left: dir * Math.max(el.clientWidth * 0.8, 240),
      behavior: "smooth",
    })
  }

  return (
    <div className={s.railWrapper}>
      <button
        type="button"
        className={`${s.railArrow} ${s.railArrowPrev}`}
        aria-label="Scroll left"
        onClick={() => scroll(-1)}
      >
        ‹
      </button>
      <div className={s.rail} ref={ref} role="group" aria-label={ariaLabel}>
        {children}
      </div>
      <button
        type="button"
        className={`${s.railArrow} ${s.railArrowNext}`}
        aria-label="Scroll right"
        onClick={() => scroll(1)}
      >
        ›
      </button>
    </div>
  )
}
