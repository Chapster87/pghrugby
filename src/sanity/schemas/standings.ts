import { defineField, defineType } from "sanity"
import { Points, LPPG } from "../components/StandingsCalculations"

export default defineType({
  name: "standings",
  title: "Standings",
  type: "document",
  fields: [
    defineField({
      name: "league",
      title: "League",
      type: "reference",
      to: [{ type: "league" }],
    }),
    defineField({
      name: "division",
      title: "Division",
      type: "reference",
      to: [{ type: "division" }],
    }),
    defineField({
      name: "season",
      title: "Season",
      type: "reference",
      to: [{ type: "season" }],
    }),
    defineField({
      name: "teams",
      title: "Teams",
      type: "array",
      of: [
        defineField({
          name: "teamData",
          title: "Team Data",
          type: "object",
          fields: [
            defineField({
              name: "team",
              title: "Team",
              type: "reference",
              to: [{ type: "team" }],
              options: {
                filter: ({ document }: { document: any }) => {
                  const leagueId = document?.league?._ref
                  const divisionId = document?.division?._ref
                  if (leagueId && divisionId) {
                    return {
                      filter:
                        "league._ref == $leagueId && division._ref == $divisionId",
                      params: { leagueId, divisionId },
                    }
                  }
                  return {
                    filter: "",
                    params: {},
                  }
                },
              },
            }),
            defineField({
              name: "gamesPlayed",
              title: "Games Played",
              type: "number",
            }),
            defineField({ name: "wins", title: "Wins", type: "number" }),
            defineField({ name: "losses", title: "Losses", type: "number" }),
            defineField({ name: "draws", title: "Draws", type: "number" }),
            defineField({
              name: "pointsFor",
              title: "Points For",
              type: "number",
            }),
            defineField({
              name: "pointsAgainst",
              title: "Points Against",
              type: "number",
            }),
            defineField({
              name: "difference",
              title: "Point Differential",
              type: "number",
            }),
            defineField({
              name: "bonusPointTries",
              title: "Bonus Point - Tries",
              type: "number",
            }),
            defineField({
              name: "bonusPointLoss",
              title: "Bonus Point - Loss",
              type: "number",
            }),
            defineField({
              name: "forfeits",
              title: "Forfeits",
              type: "number",
            }),
            defineField({
              name: "points",
              title: "Points",
              type: "number",
              components: {
                input: Points,
              },
              readOnly: true,
            }),
            defineField({
              name: "leaguePointsPerGame",
              title: "League Points Per Game",
              type: "number",
              components: {
                input: LPPG,
              },
              readOnly: true,
            }),
          ],
          preview: {
            select: {
              teamLogo: "team.teamLogo",
              teamName: "team.teamName",
              points: "points",
              lppg: "leaguePointsPerGame",
            },
            prepare(selection) {
              const { teamLogo, teamName, points, lppg } = selection
              return {
                title: teamName,
                subtitle: `Points: ${points}, LPPG: ${lppg}`,
                media: teamLogo,
              }
            },
          },
        }),
      ],
    }),
  ],
  preview: {
    select: {
      season: "season.season",
      seasonYear: "season.year",
      leagueShortName: "league.shortName",
      divisionShortName: "division.shortName",
    },
    prepare(selection) {
      const { season, seasonYear, leagueShortName, divisionShortName } =
        selection
      return {
        title: `${season} ${seasonYear} - ${leagueShortName} ${divisionShortName}`,
      }
    },
  },
})
