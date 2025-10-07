export const matchQuery = (
  leagueShortName: string,
  divisionShortName: string,
  seasonYear: number,
  seasonName: string
) => {
  return `
    *[_type == "match" && season->year == ${seasonYear} && season->season == "${seasonName}" && league->shortName == "${leagueShortName}" && division->shortName == "${divisionShortName}" && eventDateTime >= now()] {
      _id,
      eventDateTime,
      league-> {
        _id,
        name,
        shortName
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
        teamName,
        teamLogo {
          asset-> {
            url
          }
        }
      },
      awayTeam-> {
        _id,
        teamName,
        teamLogo {
          asset-> {
            url
          }
        }
      },
      name,
      homeTeamScore,
      awayTeamScore,
    } | order(eventDateTime asc)[0...1]
  `
}
