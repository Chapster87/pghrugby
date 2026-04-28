"use client"

import { useEffect, useState } from "react"
import { client } from "@/sanity/lib/client"
import { matchQuery } from "./match.query"
import Heading from "@/components/typography/heading"
import Text from "@/components/typography/text"
import s from "./styles.module.css"

interface Team {
  name: string
  logo: string
}

interface MatchData {
  forgeHome: boolean
  league: { name: string; shortName: string }
  division: { name: string; shortName: string }
  homeTeam: Team
  awayTeam: Team
  matchDate: Date
  venue?: string
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

interface MatchProps {
  league: string
  division: string
  seasonYear: number
  seasonName: string
}

export function MatchCountdown({
  league,
  division,
  seasonYear,
  seasonName,
}: MatchProps) {
  const [matchData, setMatchData] = useState<MatchData | null>(null)
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  useEffect(() => {
    const fetchMatchData = async () => {
      try {
        const results = await client.fetch(
          matchQuery(league, division, seasonYear, seasonName)
        )

        if (results && results.length > 0) {
          const data = results[0]

          const isForgeHome = data.homeTeam?.teamName?.includes("Forge")
          const isForgeAway = data.awayTeam?.teamName?.includes("Forge")

          setMatchData({
            forgeHome: isForgeHome,
            league: {
              name: data.league?.name,
              shortName: data.league?.shortName,
            },
            division: {
              name: data.division?.name,
              shortName: data.division?.shortName,
            },
            homeTeam: {
              name: data.homeTeam?.teamName,
              logo: data.homeTeam?.teamLogo?.asset?.url,
            },
            awayTeam: {
              name: data.awayTeam?.teamName,
              logo: data.awayTeam?.teamLogo?.asset?.url,
            },
            matchDate: new Date(data.eventDateTime),
            venue:
              isForgeHome || isForgeAway
                ? isForgeHome
                  ? "Home"
                  : "Away"
                : data.name,
          })
        } else {
          console.warn("No match data found or query returned an empty array.")
        }
      } catch (error) {
        console.error("Error fetching match data:", error)
      }
    }

    fetchMatchData()
  }, [league, division, seasonYear, seasonName])

  useEffect(() => {
    if (!matchData) return

    const calculateTimeLeft = (): TimeLeft => {
      const difference = matchData.matchDate.getTime() - new Date().getTime()

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
  }, [matchData])

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  }

  const padNumber = (num: number) => String(num).padStart(2, "0")

  if (!matchData) {
    return
  }

  return (
    <div className={s.countdown}>
      <Heading level="h2" className={s.divisionHeader}>
        {matchData.league.shortName} {matchData.division.name}
      </Heading>

      <div className={s.mainContent}>
        <div className={s.contentTop}>
          <Heading level="h5" className={s.venue}>
            {matchData.venue}
          </Heading>

          <Text className={s.matchDate}>
            {formatDate(matchData.matchDate).toUpperCase()}
            {/* -{" "}{formatTime(matchData.matchDate).toUpperCase()} */}
          </Text>

          <div className={s.teams}>
            <div className="flex items-center justify-between gap-4">
              {matchData.venue === "Home" ? (
                <>
                  <div className={s.teamLogo}>
                    <img
                      src={matchData.homeTeam.logo || "/placeholder.svg"}
                      alt={matchData.homeTeam.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className={s.matchup}>
                    <Text className={s.teamName}>
                      {matchData.homeTeam.name}
                    </Text>
                    <div className={s.vs}>VS</div>
                    <Text className={s.teamName}>
                      {matchData.awayTeam.name}
                    </Text>
                  </div>
                  <div className={s.teamLogo}>
                    <img
                      src={matchData.awayTeam.logo || "/placeholder.svg"}
                      alt={matchData.awayTeam.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className={s.teamLogo}>
                    <img
                      src={matchData.awayTeam.logo || "/placeholder.svg"}
                      alt={matchData.awayTeam.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className={s.matchup}>
                    <Text className={s.teamName}>
                      {matchData.awayTeam.name}
                    </Text>
                    <div className={s.vs}>@</div>
                    <Text className={s.teamName}>
                      {matchData.homeTeam.name}
                    </Text>
                  </div>
                  <div className={s.teamLogo}>
                    <img
                      src={matchData.homeTeam.logo || "/placeholder.svg"}
                      alt={matchData.homeTeam.name}
                      className="w-full h-full object-contain"
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
