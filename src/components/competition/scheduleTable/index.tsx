import Image from "next/image"
import clsx from "clsx"

import {
  filterMatchesByLeagueDivisionSeason,
  getAllMatches,
  sortMatchesByDate,
} from "@/lib/forgecms/competition.query"
import s from "./styles.module.css"

interface FormattedMatch {
  id: string
  eventDateTime: string
  homeTeam: string
  awayTeam: string
  homeTeamScore: number
  awayTeamScore: number
  homeTeamLogo: string
  awayTeamLogo: string
}

interface ScheduleTableProps {
  league: string
  division: string
  seasonYear: number
  seasonName: string
}

export default async function ScheduleTable({
  league,
  division,
  seasonYear,
  seasonName,
}: ScheduleTableProps) {
  const matches = await getAllMatches()

  const formattedSchedule: FormattedMatch[] = sortMatchesByDate(
    filterMatchesByLeagueDivisionSeason(matches, {
      league,
      division,
      seasonYear,
      seasonName,
    })
  ).map((match) => {
    const homeScore =
      typeof match.home_team_score === "number" ? match.home_team_score : 0
    const awayScore =
      typeof match.away_team_score === "number" ? match.away_team_score : 0

    return {
      id: match.id,
      eventDateTime: match.match_date_time,
      homeTeam: match.home_team?.team_name || "TBD",
      awayTeam: match.away_team?.team_name || "TBD",
      homeTeamScore: homeScore,
      awayTeamScore: awayScore,
      homeTeamLogo: match.home_team?.team_logo?.url ?? "",
      awayTeamLogo: match.away_team?.team_logo?.url ?? "",
    }
  })

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
            <th className={s.alignCenter}>Date</th>
            <th className={s.alignRight}>Home</th>
            <th className={clsx(s.resultsColumn, s.alignCenter)}>Result</th>
            <th>Away</th>
          </tr>
        </thead>
        <tbody>
          {formattedSchedule.map((match) => (
            <tr key={match.id}>
              <td className={clsx(s.date, s.alignCenter)}>
                {new Date(match.eventDateTime).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </td>
              <td className={clsx(s.homeTeam, s.alignRight)}>
                <div className={s.homeTeamContent}>
                  {match.homeTeam}

                  {match.homeTeamLogo && (
                    <Image
                      src={match.homeTeamLogo}
                      alt={`${match.homeTeam} logo`}
                      width={26}
                      height={26}
                      style={{ marginRight: "8px" }}
                    />
                  )}
                </div>
              </td>
              <td className={clsx(s.results, s.alignCenter)}>
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
                  {match.awayTeamLogo && (
                    <Image
                      src={match.awayTeamLogo}
                      alt={`${match.awayTeam} logo`}
                      width={26}
                      height={26}
                      style={{ marginRight: "8px" }}
                    />
                  )}
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
