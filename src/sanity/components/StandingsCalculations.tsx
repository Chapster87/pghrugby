import React, { useEffect, useRef } from "react"
import { useFormValue, set } from "sanity"
import { NumberInputProps, NumberSchemaType } from "sanity"

const pointsWin = 4
const pointsDraw = 2
const pointsBonusTries = 1
const pointsBonusPointLoss = 1
const pointsForfeit = -0.25

export const Points: React.FC<NumberInputProps<NumberSchemaType>> = (props) => {
  const { path, onChange, renderDefault } = props

  // Extract the _key from the path
  const key =
    path && path.length >= 2 && typeof path[1] === "object" && "_key" in path[1]
      ? path[1]._key
      : null

  // Dynamically determine the current team index
  const currentTeamPath = useFormValue(["teams"])
  const teamIndex = Array.isArray(currentTeamPath)
    ? currentTeamPath.findIndex((team) => team?._key === key)
    : 0

  const wins = Number(useFormValue(["teams", teamIndex, "wins"])) || 0
  const draws = Number(useFormValue(["teams", teamIndex, "draws"])) || 0
  const bonusPointTries =
    Number(useFormValue(["teams", teamIndex, "bonusPointTries"])) || 0
  const bonusPointLoss =
    Number(useFormValue(["teams", teamIndex, "bonusPointLoss"])) || 0
  const forfeits = Number(useFormValue(["teams", teamIndex, "forfeits"])) || 0

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

  // Use a ref to store the previous points value
  const prevPointsRef = useRef<number | null>(null)

  // Update the field value dynamically only if points have changed
  useEffect(() => {
    if (onChange && points !== prevPointsRef.current) {
      onChange(set(points))
      prevPointsRef.current = points
    }
  }, [points, onChange])

  return (
    <div>
      {renderDefault({
        ...props,
        value: points,
        onChange,
      })}
    </div>
  )
}

export const LPPG: React.FC<NumberInputProps<NumberSchemaType>> = (props) => {
  const { path, onChange, renderDefault } = props

  // Extract the _key from the path
  const key =
    path && path.length >= 2 && typeof path[1] === "object" && "_key" in path[1]
      ? path[1]._key
      : null

  // Dynamically determine the current team index
  const currentTeamPath = useFormValue(["teams"])
  const teamIndex = Array.isArray(currentTeamPath)
    ? currentTeamPath.findIndex((team) => team?._key === key)
    : 0

  const gamesPlayed =
    Number(useFormValue(["teams", teamIndex, "gamesPlayed"])) || 0
  const points = Number(useFormValue(["teams", teamIndex, "points"])) || 0

  // Calculate League Points Per Game (LPPG)
  const leaguePointsPerGame =
    gamesPlayed > 0 ? parseFloat((points / gamesPlayed).toFixed(2)) : 0

  // Use a ref to store the previous LPPG value
  const prevLPPGRef = useRef<number | null>(null)

  // Update the field value dynamically only if LPPG has changed
  useEffect(() => {
    if (onChange && leaguePointsPerGame !== prevLPPGRef.current) {
      onChange(set(leaguePointsPerGame))
      prevLPPGRef.current = leaguePointsPerGame
    }
  }, [leaguePointsPerGame, onChange])

  return (
    <div>
      {renderDefault({
        ...props,
        onChange,
      })}
    </div>
  )
}

export const Differential: React.FC<NumberInputProps<NumberSchemaType>> = (
  props
) => {
  const { path, onChange, renderDefault } = props

  // Extract the _key from the path
  const key =
    path && path.length >= 2 && typeof path[1] === "object" && "_key" in path[1]
      ? path[1]._key
      : null

  // Dynamically determine the current team index
  const currentTeamPath = useFormValue(["teams"])
  const teamIndex = Array.isArray(currentTeamPath)
    ? currentTeamPath.findIndex((team) => team?._key === key)
    : 0

  const pointsFor = Number(useFormValue(["teams", teamIndex, "pointsFor"])) || 0
  const pointsAgainst =
    Number(useFormValue(["teams", teamIndex, "pointsAgainst"])) || 0

  const difference = pointsFor - pointsAgainst

  // Use a ref to store the previous difference value
  const prevDifferenceRef = useRef<number | null>(null)

  // Update the field value dynamically only if difference has changed
  useEffect(() => {
    if (onChange && difference !== prevDifferenceRef.current) {
      onChange(set(difference))
      prevDifferenceRef.current = difference
    }
  }, [difference, onChange])

  return (
    <div>
      {renderDefault({
        ...props,
        onChange,
      })}
    </div>
  )
}
