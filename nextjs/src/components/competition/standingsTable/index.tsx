"use client"

import { useEffect, useState } from "react"
import { client } from "@/sanity/lib/client"
import { standingsQuery } from "./standings.query"
import s from "./styles.module.css"

interface TeamData {
  team: {
    _id: string
    teamName: string
    teamLogo: {
      asset: {
        url: string
      }
    }
  }
  gamesPlayed: number
  wins: number
  losses: number
  draws: number
  pointsFor: number
  pointsAgainst: number
  difference: number
  bonusPointTries: number
  bonusPointLoss: number
  forfeits: number
  points: number
  leaguePointsPerGame: number
}

interface StandingsTableProps {
  league: string
  division: string
  seasonYear: number
  seasonName: string
}

const StandingsTable: React.FC<StandingsTableProps> = ({
  league,
  division,
  seasonYear,
  seasonName,
}) => {
  const [standings, setStandings] = useState<TeamData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStandings = async () => {
      const standingsData = await client.fetch(
        standingsQuery(league, division, seasonYear, seasonName)
      )

      const sortedStandings = (standingsData[0]?.teams || []).sort(
        (a: TeamData, b: TeamData) => {
          if (b.points !== a.points) {
            return b.points - a.points // Sort by points descending
          }
          return a.pointsAgainst - b.pointsAgainst // Sort by pointsAgainst ascending if points are tied
        }
      )

      setStandings(sortedStandings)
      setLoading(false)
    }

    fetchStandings()
  }, [league, division, seasonYear, seasonName])

  const toKebabCase = (str: string) => {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <table className={s.standingsTable}>
        <thead>
          <tr>
            <th colSpan={13} className={`${s.primaryHeader}`}>
              {`${league} ${division} - ${seasonName} ${seasonYear}`}
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
            <th>Pts</th>
            <th>LPPG</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((teamData) => (
            <tr
              key={teamData.team._id}
              className={s[toKebabCase(teamData.team.teamName)]}
            >
              <td>{standings.indexOf(teamData) + 1}</td>
              <td className={s.teamName}>
                <div className={`${s.teamName}`}>
                  <img
                    src={teamData.team.teamLogo.asset.url}
                    alt={`${teamData.team.teamName} logo`}
                    width={26}
                    height={26}
                    style={{ marginRight: "8px" }}
                  />
                  {teamData.team.teamName}
                </div>
              </td>
              <td>{teamData.gamesPlayed}</td>
              <td>{teamData.wins}</td>
              <td>{teamData.losses}</td>
              <td>{teamData.draws}</td>
              <td>{teamData.pointsFor}</td>
              <td>{teamData.pointsAgainst}</td>
              <td>{teamData.difference}</td>
              <td>{teamData.bonusPointTries}</td>
              <td>{teamData.bonusPointLoss}</td>
              <td>{teamData.points}</td>
              <td>{teamData.leaguePointsPerGame.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default StandingsTable
