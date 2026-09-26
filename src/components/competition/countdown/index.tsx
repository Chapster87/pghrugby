"use client"

import { useEffect, useMemo, useState } from "react"
import clsx from "clsx"
import Image from "next/image"

import type { ForgeCmsMatch } from "@/lib/forgecms/competition.query"
import Heading from "@components/typography/heading"
import Text from "@components/typography/text"
import s from "./styles.module.css"

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

interface MatchCountdownProps {
  /** The next upcoming match for this surface (null when none scheduled). */
  match: ForgeCmsMatch | null
}

export function MatchCountdown({ match }: MatchCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  const isForgeHome = match?.home_team?.team_name?.includes("Forge")
  const isForgeAway = match?.away_team?.team_name?.includes("Forge")
  const venue =
    isForgeHome || isForgeAway
      ? isForgeHome
        ? "Home"
        : "Away"
      : match?.event_name ?? ""
  const matchDate = useMemo(
    () => (match ? new Date(match.match_date_time) : null),
    [match]
  )

  useEffect(() => {
    if (!matchDate) return

    const calculateTimeLeft = (): TimeLeft => {
      const difference = matchDate.getTime() - new Date().getTime()

      if (difference > 0) {
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        }
      }

      return { days: 0, hours: 0, minutes: 0, seconds: 0 }
    }

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [matchDate])

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  const padNumber = (num: number) => String(num).padStart(2, "0")

  if (!match) {
    return
  }

  return (
    <div className={s.countdown}>
      <Heading level="h2" className={s.divisionHeader}>
        {match.league?.short_name} {match.division?.name}
      </Heading>

      <div className={s.mainContent}>
        <div className={s.contentTop}>
          <Heading level="h5" className={s.venue}>
            {venue}
          </Heading>

          <Text className={s.matchDate}>
            {matchDate && formatDate(matchDate).toUpperCase()}
            {/* -{" "}{formatTime(matchDate).toUpperCase()} */}
          </Text>

          <div className={s.teams}>
            <div className={s.teamDisplay}>
              {venue === "Home" ? (
                <>
                  <div className={s.teamLogo}>
                    <Image
                      src={
                        match.home_team?.team_logo?.url || "/placeholder.svg"
                      }
                      alt={match.home_team?.team_name || "Home team"}
                      fill
                      sizes="64px"
                      className={clsx(s.fullSizeImage, s.objectContain)}
                    />
                  </div>
                  <div className={s.matchup}>
                    <Text className={s.teamName}>
                      {match.home_team?.team_name}
                    </Text>
                    <div className={s.vs}>VS</div>
                    <Text className={s.teamName}>
                      {match.away_team?.team_name}
                    </Text>
                  </div>
                  <div className={s.teamLogo}>
                    <Image
                      src={
                        match.away_team?.team_logo?.url || "/placeholder.svg"
                      }
                      alt={match.away_team?.team_name || "Away team"}
                      fill
                      sizes="64px"
                      className={clsx(s.fullSizeImage, s.objectContain)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className={s.teamLogo}>
                    <Image
                      src={
                        match.away_team?.team_logo?.url || "/placeholder.svg"
                      }
                      alt={match.away_team?.team_name || "Away team"}
                      fill
                      sizes="64px"
                      className={clsx(s.fullSizeImage, s.objectContain)}
                    />
                  </div>
                  <div className={s.matchup}>
                    <Text className={s.teamName}>
                      {match.away_team?.team_name}
                    </Text>
                    <div className={s.vs}>@</div>
                    <Text className={s.teamName}>
                      {match.home_team?.team_name}
                    </Text>
                  </div>
                  <div className={s.teamLogo}>
                    <Image
                      src={
                        match.home_team?.team_logo?.url || "/placeholder.svg"
                      }
                      alt={match.home_team?.team_name || "Home team"}
                      fill
                      sizes="64px"
                      className={clsx(s.fullSizeImage, s.objectContain)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className={s.countdownTimer}>
          <div className={s.timerInner}>
            <div className={s.timeBox}>
              <p className={s.timeValue}>{padNumber(timeLeft.days)}</p>
              <p className={s.timeLabel}>days</p>
            </div>

            <div className={s.timeBox}>
              <p className={s.timeValue}>{padNumber(timeLeft.hours)}</p>
              <p className={s.timeLabel}>hrs</p>
            </div>

            <div className={s.timeBox}>
              <p className={s.timeValue}>{padNumber(timeLeft.minutes)}</p>
              <p className={s.timeLabel}>mins</p>
            </div>

            <div className={s.timeBox}>
              <p className={s.timeValue}>{padNumber(timeLeft.seconds)}</p>
              <p className={s.timeLabel}>secs</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
