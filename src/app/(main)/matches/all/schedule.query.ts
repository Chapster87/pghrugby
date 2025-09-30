import { defineQuery } from "next-sanity"

export const scheduleQuery = defineQuery(`
  *[_type == "match"] {
    _id,
    eventDateTime,
    league-> {
      _id,
      name
    },
    division-> {
      _id,
      name
    },
    season-> {
      _id,
      name
    },
    matchType,
    homeTeam-> {
      _id,
      name
    },
    awayTeam-> {
      _id,
      name
    },
    name,
    homeTeamScore,
    awayTeamScore
  } | order(eventDateTime asc)
`)
