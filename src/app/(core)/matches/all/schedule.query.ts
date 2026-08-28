import { defineQuery } from "next-sanity"

export const teamsQuery = `
  query TeamsQuery {
    teamsCollection {
      edges {
        node {
          team_name
          short_name
          # Resolved League record
          league {
            name
            short_name
          }
          # Resolved Division record (Polymorphic fix applied)
          divison {
            name
            short_name
          }
          # Resolved Media Asset
          team_logo {
            url
            name
          }
        }
      }
    }
  }
`

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
