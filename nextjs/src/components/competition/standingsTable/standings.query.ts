export const standingsQuery = (
  leagueShortName: string,
  divisionShortName: string,
  seasonYear: number,
  seasonName: string
) => {
  return `
  query StandingsQuery {
    standingsCollection(where: {
      league: { slug: "${leagueShortName}" },
      division: { slug: "${divisionShortName}" },
      season: { 
        year: ${seasonYear},
        season: "${seasonName}"
      }
    }) {
      edges {
        node {
          league {
            name
            slug
            short_name
          }
          season {
            year
            display_name
            season
          }
          division {
            short_name
            name
            slug
          }
          league_standings
        }
      }
    }
  }
`
}
