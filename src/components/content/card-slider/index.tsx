"use client"

import { useRef, useState, useEffect } from "react"
import { ContentCard } from "../card"
import { Arrow, Dot } from "../slider-nav"
import clsx from "clsx"
import s from "./styles.module.css"

type ContentCard = {
  type: string
  title: string
  slug: string
  date: string
  excerpt: string
  featuredMedia: string
}

// Set how many slides to show at once
const SLIDES_TO_SHOW = 5
const GAP_PX = 16
// Calculate width: each slide gets a fraction of container minus gaps
// Total gap width = (SLIDES_TO_SHOW - 1) * GAP_PX
// Slide width = (100% - totalGapPx) / SLIDES_TO_SHOW
const slideWidthCalc = `calc((100% - ${
  (SLIDES_TO_SHOW - 1) * GAP_PX
}px) / ${SLIDES_TO_SHOW})`

export function CardSlider({
  data,
}: {
  data: { title: string; items: ContentCard[] }
}) {
  const slideRefs = useRef<(HTMLDivElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [current, setCurrent] = useState(0)
  const totalSlides = data.items.length

  const scrollToSlide = (idx: number) => {
    setCurrent(idx)
    const slide = slideRefs.current[idx]
    const container = containerRef.current
    if (slide && container) {
      const slideLeft = slide.offsetLeft
      container.scrollTo({ left: slideLeft, behavior: "smooth" })
    }
  }

  const handlePrev = () => {
    if (current > 0) scrollToSlide(current - 1)
  }
  const handleNext = () => {
    if (current < totalSlides - 1) scrollToSlide(current + 1)
  }

  // Only show dots for slides that can be scrolled to the start
  const maxDotIdx = Math.max(0, totalSlides - SLIDES_TO_SHOW)

  return (
    <div className={s.cardSliderWrapper}>
      <button
        type="button"
        aria-label="Previous slide"
        onClick={handlePrev}
        disabled={current === 0}
        className={`${s.arrow} ${s.arrowPrev}`}
      >
        <Arrow direction="left" />
      </button>
      <div className={s.cardSlider} ref={containerRef}>
        {data.items.map((item: ContentCard, idx: number) => (
          <div
            key={item.slug}
            ref={(el) => {
              slideRefs.current[idx] = el
            }}
            className={s.cardSliderSlide}
            style={{
              minWidth: slideWidthCalc,
              gap: `${GAP_PX}px`,
            }}
          >
            <ContentCard data={item} />
          </div>
        ))}
      </div>
      <button
        type="button"
        aria-label="Next slide"
        onClick={handleNext}
        disabled={current === totalSlides - 1}
        className={`${s.arrow} ${s.arrowNext}`}
      >
        <Arrow direction="right" />
      </button>
      <div className={s.sliderDots}>
        {[...Array(maxDotIdx + 1)].map((_, idx) => (
          <button
            key={idx}
            aria-label={`Go to slide ${idx + 1}`}
            onClick={() => scrollToSlide(idx)}
            className={clsx(s.dot, { [s.dotActive]: current === idx })}
          >
            <Dot current={current === idx} />
          </button>
        ))}
      </div>
    </div>
  )
}
