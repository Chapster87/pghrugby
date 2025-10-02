import React from "react"
import { useFormValue } from "sanity"
import { NumberInputProps, NumberSchemaType } from "sanity"

export const StandingsPoints: React.FC<NumberInputProps<NumberSchemaType>> = (
  props
) => {
  const { value, onChange, renderDefault } = props

  const pointsWin = 4
  const pointsDraw = 2
  const pointsBonusTries = 1
  const pointsBonusPointLoss = 1
  const pointsForfeit = -0.25

  // Explicitly fetch points and gamesPlayed values
  const gamesPlayed = Number(useFormValue(["teams", 0, "gamesPlayed"])) || 0 // Replace 0 with the correct index if dynamic
  const wins = Number(useFormValue(["teams", 0, "wins"])) || 0
  const draws = Number(useFormValue(["teams", 0, "draws"])) || 0
  const bonusPointTries =
    Number(useFormValue(["teams", 0, "bonusPointTries"])) || 0
  const bonusPointLoss =
    Number(useFormValue(["teams", 0, "bonusPointLoss"])) || 0
  const forfeits = Number(useFormValue(["teams", 0, "forfeits"])) || 0

  const teamWinPoints = wins * pointsWin
  const teamDrawPoints = draws * pointsDraw
  const teamBonusTryPoints = bonusPointTries * pointsBonusTries
  const teamBonusPointLossPoints = bonusPointLoss * pointsBonusPointLoss
  const teamForfeitPoints = forfeits * pointsForfeit

  const points =
    teamWinPoints +
    teamDrawPoints +
    teamBonusTryPoints +
    teamBonusPointLossPoints +
    teamForfeitPoints

  console.log("teamWinPoints:", teamWinPoints)
  console.log("teamDrawPoints:", teamDrawPoints)
  console.log("teamBonusTryPoints:", teamBonusTryPoints)
  console.log("teamBonusPointLossPoints:", teamBonusPointLossPoints)
  console.log("teamForfeitPoints:", teamForfeitPoints)
  console.log("Points:", points)
  console.log("Games Played:", gamesPlayed)

  // Calculate League Points Per Game (LPPG)
  const leaguePointsPerGame =
    gamesPlayed > 0 ? parseFloat((points / gamesPlayed).toFixed(2)) : 0

  return (
    <div>
      {/* {renderDefault({
        ...props,
        value,
        onChange,
      })} */}
      <p>Points: {points}</p>
      <p>League Points Per Game: {leaguePointsPerGame}</p>
    </div>
  )
}
