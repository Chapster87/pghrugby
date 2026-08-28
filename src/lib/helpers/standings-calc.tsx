/**
 * Standings calculation constants
 */
const POINTS_WIN = 4
const POINTS_DRAW = 2
const POINTS_BONUS_TRIES = 1
const POINTS_BONUS_LOSS = 1
const POINTS_FORFEIT = -0.25

/**
 * Calculates total standings points based on team record
 * @param wins - Number of wins
 * @param draws - Number of draws
 * @param bonusPointTries - Number of bonus point tries
 * @param bonusPointLoss - Number of bonus point losses
 * @param forfeits - Number of forfeits
 * @returns Total points
 */
export const calculateStandingsPoints = (
  wins: number,
  draws: number,
  bonusPointTries: number,
  bonusPointLoss: number,
  forfeits: number
): number => {
  return (
    wins * POINTS_WIN +
    draws * POINTS_DRAW +
    bonusPointTries * POINTS_BONUS_TRIES +
    bonusPointLoss * POINTS_BONUS_LOSS +
    forfeits * POINTS_FORFEIT
  )
}

/**
 * Calculates League Points Per Game (LPPG)
 * @param points - Total standings points
 * @param gamesPlayed - Number of games played
 * @returns LPPG rounded to 2 decimal places
 */
export const calculateLPPG = (points: number, gamesPlayed: number): number => {
  return gamesPlayed > 0 ? parseFloat((points / gamesPlayed).toFixed(2)) : 0
}

/**
 * Sorts teams by points (descending) and points against (ascending)
 * @param teams - Array of team data
 * @returns Sorted array of teams with calculated points and LPPG
 */
export const sortStandings = <
  T extends {
    w: number
    t: number
    bt: number
    bl: number
    ff: number
    gp: number
    pa: number
  }
>(
  teams: T[]
) => {
  return teams
    .map((team) => {
      const points = calculateStandingsPoints(
        team.w,
        team.t,
        team.bt,
        team.bl,
        team.ff
      )
      const lppg = calculateLPPG(points, team.gp)

      return {
        ...team,
        calculatedPoints: points,
        calculatedLPPG: lppg,
      }
    })
    .sort((a, b) => {
      if (b.calculatedPoints !== a.calculatedPoints) {
        return b.calculatedPoints - a.calculatedPoints // Sort by points descending
      }
      return a.pa - b.pa // Sort by pointsAgainst (pa) ascending if points are tied
    })
}
