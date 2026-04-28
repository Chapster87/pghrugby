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

interface MatchProps {
  league: string
  division: string
  seasonYear: number
  seasonName: string
}

export default function Match({
  league,
  division,
  seasonYear,
  seasonName,
}: MatchProps) {
  const [matchData, setMatchData] = useState<MatchData | null>(null)

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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  if (!matchData) {
    return
  }

  return (
    <div className={s.match}>
      <Heading level="h5" className={s.venue}>
        {matchData.league.shortName} {matchData.division.name}
      </Heading>

      <Text className={s.matchDate}>
        {formatDate(matchData.matchDate).toUpperCase()}
        {/* -{" "}{formatTime(matchData.matchDate).toUpperCase()} */}
      </Text>

      <div className={s.teams}>
        {matchData.venue === "Home" ? (
          <>
            <div className={`${s.team} ${s.homeTeam}`}>
              <div className={s.teamLogo}>
                <img
                  src={matchData.homeTeam.logo || "/placeholder.svg"}
                  alt={matchData.homeTeam.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <Text className={s.teamName}>{matchData.homeTeam.name}</Text>
            </div>
            <div className={s.atVs}>
              <div className={s.vs}>VS</div>
            </div>
            <div className={`${s.team} ${s.awayTeam}`}>
              <div className={s.teamLogo}>
                <img
                  src={matchData.awayTeam.logo || "/placeholder.svg"}
                  alt={matchData.awayTeam.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <Text className={s.teamName}>{matchData.awayTeam.name}</Text>
            </div>
          </>
        ) : (
          <>
            <div className={`${s.team} ${s.awayTeam}`}>
              <div className={s.teamLogo}>
                <img
                  src={matchData.awayTeam.logo || "/placeholder.svg"}
                  alt={matchData.awayTeam.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <Text className={s.teamName}>{matchData.awayTeam.name}</Text>
            </div>
            <div className={s.atVs}>
              <div className={s.vs}>@</div>
            </div>
            <div className={`${s.team} ${s.homeTeam}`}>
              <div className={s.teamLogo}>
                <img
                  src={matchData.homeTeam.logo || "/placeholder.svg"}
                  alt={matchData.homeTeam.name}
                  className="w-full h-full object-contain"
                />
              </div>
              <Text className={s.teamName}>{matchData.homeTeam.name}</Text>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
