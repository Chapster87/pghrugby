export const standingsQuery = (
  leagueShortName: string,
  divisionShortName: string,
  seasonYear: number,
  seasonName: string
) => {
  return `
    *[_type == "standings" && season->year == ${seasonYear} && season->season == "${seasonName}" && league->shortName == "${leagueShortName}" && division->shortName == "${divisionShortName}"] {
      _id,
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
        name,
        year
      },
      teams[] {
        team-> {
          _id,
          teamName,
          teamLogo {
            asset-> {
              url
            }
          }
        },
        gamesPlayed,
        wins,
        losses,
        draws,
        pointsFor,
        pointsAgainst,
        difference,
        bonusPointTries,
        bonusPointLoss,
        forfeits,
        points,
        leaguePointsPerGame
      }
    } | order(points desc, pointsAgainst asc)
  `
}
