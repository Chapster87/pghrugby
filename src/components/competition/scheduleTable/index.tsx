"use client"

import { useEffect, useState } from "react"
import { client } from "@/sanity/lib/client"
import { scheduleQuery } from "./schedule.query"
import Image from "next/image"
import { urlFor } from "@/sanity/lib/image"
import s from "./styles.module.css"
import clsx from "clsx"

interface Match {
  _id: string
  eventDateTime: string
  league?: { name: string }
  division?: { name: string }
  season?: { _id: string; year: number; season: string }
  matchType?: string
  homeTeam?: {
    _id: string
    teamName?: string
    league?: string
    division?: string
  }
  awayTeam?: {
    _id: string
    teamName?: string
    league?: string
    division?: string
  }
  name: string
  homeTeamScore?: number
  awayTeamScore?: number
}

interface FormattedMatch {
  id: string
  eventDateTime: string
  league: string
  division: string
  season: string
  matchType: string
  homeTeam: string
  awayTeam: string
  name: string
  homeTeamScore: number
  awayTeamScore: number
  winningTeam: string
  homeTeamLogo: string
  awayTeamLogo: string
}

interface ScheduleTableProps {
  league: string
  division: string
  seasonYear: number
  seasonName: string
}

const ScheduleTable: React.FC<ScheduleTableProps> = ({
  league,
  division,
  seasonYear,
  seasonName,
}) => {
  const [schedule, setSchedule] = useState<FormattedMatch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSchedule = async () => {
      const scheduleData: Match[] = await client.fetch(
        scheduleQuery(league, division, seasonYear, seasonName)
      )

      const formattedSchedule: FormattedMatch[] = await Promise.all(
        scheduleData.map(async (match) => {
          const homeTeam =
            match.homeTeam?._id &&
            (await client.fetch(
              `*[_type == "team" && _id == $id][0]{teamName, "league": league->shortName, "division": division->shortName, teamLogo}`,
              { id: match.homeTeam._id }
            ))

          const awayTeam =
            match.awayTeam?._id &&
            (await client.fetch(
              `*[_type == "team" && _id == $id][0]{teamName, "league": league->shortName, "division": division->shortName, teamLogo}`,
              { id: match.awayTeam._id }
            ))

          const season =
            match.season?._id &&
            (await client.fetch(
              `*[_type == "season" && _id == $id][0]{year, season}`,
              { id: match.season._id }
            ))

          const homeScore =
            typeof match.homeTeamScore === "number" ? match.homeTeamScore : 0
          const awayScore =
            typeof match.awayTeamScore === "number" ? match.awayTeamScore : 0

          const winningTeam =
            homeScore > awayScore
              ? homeTeam?.teamName || "TBD"
              : homeScore < awayScore
              ? awayTeam?.teamName || "TBD"
              : "Draw"

          return {
            id: match._id,
            eventDateTime: new Date(match.eventDateTime).toLocaleString(
              "en-US",
              {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              }
            ),
            league: match.league?.name || "Unknown League",
            division: match.division?.name || "Unknown Division",
            season: season
              ? `${season.season} ${season.year}`
              : "Unknown Season",
            matchType: match.matchType || "Unknown Type",
            homeTeam: homeTeam?.teamName || "TBD",
            awayTeam: awayTeam?.teamName || "TBD",
            name: match.name,
            homeTeamScore: homeScore,
            awayTeamScore: awayScore,
            winningTeam,
            homeTeamLogo: homeTeam?.teamLogo
              ? urlFor(homeTeam.teamLogo).url()
              : "",
            awayTeamLogo: awayTeam?.teamLogo
              ? urlFor(awayTeam.teamLogo).url()
              : "",
          }
        })
      )

      setSchedule(formattedSchedule)
      setLoading(false)
    }

    fetchSchedule()
  }, [league, division, seasonYear, seasonName])

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <table className={s.scheduleTable}>
        <thead>
          <tr>
            <th colSpan={4} className={`${s.primaryHeader}`}>
              {`${league} ${division} - ${seasonName} ${seasonYear}`}
            </th>
          </tr>
          <tr>
            <th className="align-center">Date</th>
            <th className="align-right">Home</th>
            <th className={`${s.resultsColumn} align-center`}>Result</th>
            <th>Away</th>
          </tr>
        </thead>
        <tbody>
          {schedule.map((match) => (
            <tr key={match.id}>
              <td className={`${s.date} align-center`}>
                {new Date(match.eventDateTime).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </td>
              <td className={`${s.homeTeam} align-right`}>
                <div className={`${s.homeTeamContent}`}>
                  {match.homeTeam}

                  <Image
                    src={match.homeTeamLogo}
                    alt={`${match.homeTeam} logo`}
                    width={26}
                    height={26}
                    style={{ marginRight: "8px" }}
                  />
                </div>
              </td>
              <td className={clsx(s.results, "align-center")}>
                {match.homeTeamScore || match.awayTeamScore ? (
                  <span
                    className={clsx({
                      [s.win]:
                        (match.homeTeam === "Pittsburgh Forge" &&
                          match.homeTeamScore > match.awayTeamScore) ||
                        (match.awayTeam === "Pittsburgh Forge" &&
                          match.awayTeamScore > match.homeTeamScore),
                      [s.loss]:
                        (match.homeTeam === "Pittsburgh Forge" &&
                          match.homeTeamScore < match.awayTeamScore) ||
                        (match.awayTeam === "Pittsburgh Forge" &&
                          match.awayTeamScore < match.homeTeamScore),
                      [s.draw]: match.homeTeamScore === match.awayTeamScore,
                    })}
                  >
                    {(match.homeTeam === "Pittsburgh Forge" &&
                      match.homeTeamScore > match.awayTeamScore) ||
                    (match.awayTeam === "Pittsburgh Forge" &&
                      match.awayTeamScore > match.homeTeamScore)
                      ? "Win"
                      : (match.homeTeam === "Pittsburgh Forge" &&
                          match.homeTeamScore < match.awayTeamScore) ||
                        (match.awayTeam === "Pittsburgh Forge" &&
                          match.awayTeamScore < match.homeTeamScore)
                      ? "Loss"
                      : "Draw"}
                  </span>
                ) : null}
                {match.homeTeamScore || match.awayTeamScore
                  ? `${match.homeTeamScore} - ${match.awayTeamScore}`
                  : "-"}
              </td>
              <td className={`${s.awayTeam}`}>
                <div className={`${s.awayTeamContent}`}>
                  <Image
                    src={match.awayTeamLogo}
                    alt={`${match.awayTeam} logo`}
                    width={26}
                    height={26}
                    style={{ marginRight: "8px" }}
                  />
                  {match.awayTeam}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default ScheduleTable
