"use client"

import { useEffect, useState } from "react"
import clsx from "clsx"

import s from "./style.module.css"

type TimeLeft = {
  days: number
  hours: number
  minutes: number
  seconds: number
}

type FixtureCountdownProps = {
  /** The fixture's ISO date-time. */
  dateTime: string
  /** Render a single-line "3d 04h 12m" instead of the four-cell timer. */
  compact?: boolean
  /** The four-cell timer's scale. `sm` is the ticker size. */
  size?: "default" | "sm"
}

/**
 * A live countdown to a fixture's kickoff.
 * @param props.dateTime - The fixture's ISO date-time.
 * @param props.compact - Whether to render the compact single-line form.
 * @param props.size - The four-cell timer's scale.
 * @returns The ticking countdown, or null before the first tick.
 */
export function FixtureCountdown({
  dateTime,
  compact = false,
  size = "default",
}: FixtureCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null)

  useEffect(() => {
    const target = new Date(dateTime).getTime()

    const tick = () => {
      const difference = target - Date.now()
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }
      setTimeLeft({
        days: Math.floor(difference / 86_400_000),
        hours: Math.floor((difference / 3_600_000) % 24),
        minutes: Math.floor((difference / 60_000) % 60),
        seconds: Math.floor((difference / 1_000) % 60),
      })
    }

    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [dateTime])

  if (!timeLeft) return null

  const pad = (value: number) => String(value).padStart(2, "0")

  if (compact) {
    return (
      <span className={s.countdownCompact} aria-label="Time until kickoff">
        {timeLeft.days}d {pad(timeLeft.hours)}h {pad(timeLeft.minutes)}m
      </span>
    )
  }

  return (
    <div
      className={clsx(s.countdown, size === "sm" && s.countdownSm)}
      aria-label="Time until kickoff"
    >
      <div className={s.countdownCell}>
        <span className={s.countdownValue}>{pad(timeLeft.days)}</span>
        <span className={s.countdownLabel}>days</span>
      </div>
      <div className={s.countdownCell}>
        <span className={s.countdownValue}>{pad(timeLeft.hours)}</span>
        <span className={s.countdownLabel}>hrs</span>
      </div>
      <div className={s.countdownCell}>
        <span className={s.countdownValue}>{pad(timeLeft.minutes)}</span>
        <span className={s.countdownLabel}>mins</span>
      </div>
      <div className={s.countdownCell}>
        <span className={s.countdownValue}>{pad(timeLeft.seconds)}</span>
        <span className={s.countdownLabel}>secs</span>
      </div>
    </div>
  )
}
