import { executeQuery } from "@/lib/forgecms/execute-query"
import { sortStandings } from "@/lib/helpers/standings-calc"

import { standingsQuery } from "./standings.query"
import clsx from "clsx"
import s from "./styles.module.css"

interface TeamData {
  team_id: string
  team_name: string
  is_focused: string
  gp: number
  w: number
  l: number
  t: number
  pf: number
  pa: number
  pd: number
  bt: number
  bl: number
  ff: number
  points: number
  league_points_per_game: number
}

interface StandingsTableProps {
  leagueSlug: string
  divisionSlug: string
  seasonYear: number
  seasonName: string
}

export async function StandingsTable({
  leagueSlug,
  divisionSlug,
  seasonYear,
  seasonName,
}: StandingsTableProps) {
  const standings = await executeQuery(
    standingsQuery(leagueSlug, divisionSlug, seasonYear, seasonName)
  )

  const { division, league, league_standings, season } =
    standings.standingsCollection.edges[0].node

  const typedLeagueStandings = league_standings as TeamData[]

  const processedStandings = sortStandings(typedLeagueStandings)

  console.log("Standings Data:", standings)

  const toKebabCase = (str: string) => {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  }

  return (
    <div>
      <table className={s.standingsTable}>
        <thead>
          <tr>
            <th colSpan={14} className={`${s.primaryHeader}`}>
              {`${league.name} ${division.name} - ${season.display_name}`}
            </th>
          </tr>
          <tr>
            <th>Pos</th>
            <th>Team</th>
            <th>GP</th>
            <th>W</th>
            <th>L</th>
            <th>D</th>
            <th>PF</th>
            <th>PA</th>
            <th>PD</th>
            <th>BT</th>
            <th>BL</th>
            <th>FF</th>
            <th>Pts</th>
            <th>LPPG</th>
          </tr>
        </thead>
        <tbody>
          {processedStandings.map((teamData, index) => {
            const isFocusTeam = teamData.is_focused
            return (
              <tr
                key={teamData.team_id}
                className={clsx(
                  {
                    [s.focusTeam]: isFocusTeam,
                  },
                  s[toKebabCase(teamData.team_name)]
                )}
              >
                <td>{index + 1}</td>
                <td className={s.teamName}>
                  <div className={`${s.teamName}`}>
                    {/* <img
                    src={teamData.team.teamLogo.asset.url}
                    alt={`${teamData.team.teamName} logo`}
                    width={26}
                    height={26}
                    style={{ marginRight: "8px" }}
                  /> */}
                    {teamData.team_name}
                  </div>
                </td>
                <td>{teamData.gp}</td>
                <td>{teamData.w}</td>
                <td>{teamData.l}</td>
                <td>{teamData.t}</td>
                <td>{teamData.pf}</td>
                <td>{teamData.pa}</td>
                <td>{teamData.pd}</td>
                <td>{teamData.bt}</td>
                <td>{teamData.bl}</td>
                <td>{teamData.ff}</td>
                <td>{teamData.calculatedPoints}</td>
                <td>{teamData.calculatedLPPG.toFixed(2)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
