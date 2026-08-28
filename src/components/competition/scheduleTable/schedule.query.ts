export const scheduleQuery = (
  leagueShortName: string,
  divisionShortName: string,
  seasonYear: number,
  seasonName: string
) => {
  return `
    *[_type == "match" && season->year == ${seasonYear} && season->season == "${seasonName}" && league->shortName == "${leagueShortName}" && division->shortName == "${divisionShortName}"] {
      _id,
      eventDateTime,
      league-> {
        _id,
        name
      },
      division-> {
        _id,
        name,
        shortName
      },
      season-> {
        _id,
        name
      },
      matchType,
      homeTeam-> {
        _id,
        name,
        teamLogo {
          asset-> {
            url
          }
        }
      },
      awayTeam-> {
        _id,
        name,
        teamLogo {
          asset-> {
            url
          }
        }
      },
      name,
      homeTeamScore,
      awayTeamScore
    } | order(eventDateTime asc)
  `
}
