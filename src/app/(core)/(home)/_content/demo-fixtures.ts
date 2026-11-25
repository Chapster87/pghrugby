/**
 * Demo matchday data for the static homepage ticker. Replace with ForgeCMS
 * reads when the dynamic wiring lands. Dates sit on a future demo week so the
 * countdowns tick.
 */
export type DemoMatch = {
  id: string
  /** The side and division, e.g. "Men's D1". */
  side: string
  home: string
  away: string
  dateTime: string
  venue: "Home" | "Away"
}

export const demoUpcoming: DemoMatch[] = [
  {
    id: "u1",
    side: "Men's D1",
    home: "Pittsburgh Forge",
    away: "Metropolis Valkyries",
    dateTime: "2026-12-05T13:00:00-05:00",
    venue: "Home",
  },
  {
    id: "u2",
    side: "Men's D3",
    home: "Detroit Treadmen",
    away: "Pittsburgh Forge",
    dateTime: "2026-12-05T15:00:00-05:00",
    venue: "Away",
  },
  {
    id: "u3",
    side: "Men's D4",
    home: "Pittsburgh Forge",
    away: "Cleveland Crusaders",
    dateTime: "2026-12-06T13:00:00-05:00",
    venue: "Home",
  },
  {
    id: "u4",
    side: "Women's D1",
    home: "Buffalo Women's Rugby Club",
    away: "Pittsburgh Forge",
    dateTime: "2026-12-06T15:00:00-05:00",
    venue: "Away",
  },
  {
    id: "u5",
    side: "Women's D2",
    home: "Pittsburgh Forge",
    away: "Columbus Coyotes",
    dateTime: "2026-12-06T17:00:00-05:00",
    venue: "Home",
  },
]
