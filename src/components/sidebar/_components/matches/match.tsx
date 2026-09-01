import {
  findNextUpcomingMatch,
  getAllMatches,
} from "@/lib/forgecms/competition.query"
import Heading from "@components/typography/heading"
import Text from "@components/typography/text"
import s from "./styles.module.css"

interface MatchProps {
  league: string
  division: string
  seasonYear: number
  seasonName: string
}

export default async function Match({
  league,
  division,
  seasonYear,
  seasonName,
}: MatchProps) {
  const matches = await getAllMatches()
  const match = findNextUpcomingMatch(matches, {
    league,
    division,
    seasonYear,
    seasonName,
  })

  if (!match) {
    return null
  }

  const isForgeHome = match.home_team?.team_name?.includes("Forge")
  const isForgeAway = match.away_team?.team_name?.includes("Forge")
  const venue =
    isForgeHome || isForgeAway
      ? isForgeHome
        ? "Home"
        : "Away"
      : match.event_name

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className={s.match}>
      <Heading level="h5" className={s.venue}>
        {match.league?.short_name} {match.division?.name}
      </Heading>

      <Text className={s.matchDate}>
        {formatDate(new Date(match.match_date_time)).toUpperCase()}
        {/* -{" "}{formatTime(matchDate).toUpperCase()} */}
      </Text>

      <div className={s.teams}>
        {venue === "Home" ? (
          <>
            <div className={`${s.team} ${s.homeTeam}`}>
              <div className={s.teamLogo}>
                <img
                  src={match.home_team?.team_logo?.url || "/placeholder.svg"}
                  alt={match.home_team?.team_name || "Home team"}
                  className="w-full h-full object-contain"
                />
              </div>
              <Text className={s.teamName}>{match.home_team?.team_name}</Text>
            </div>
            <div className={s.atVs}>
              <div className={s.vs}>VS</div>
            </div>
            <div className={`${s.team} ${s.awayTeam}`}>
              <div className={s.teamLogo}>
                <img
                  src={match.away_team?.team_logo?.url || "/placeholder.svg"}
                  alt={match.away_team?.team_name || "Away team"}
                  className="w-full h-full object-contain"
                />
              </div>
              <Text className={s.teamName}>{match.away_team?.team_name}</Text>
            </div>
          </>
        ) : (
          <>
            <div className={`${s.team} ${s.awayTeam}`}>
              <div className={s.teamLogo}>
                <img
                  src={match.away_team?.team_logo?.url || "/placeholder.svg"}
                  alt={match.away_team?.team_name || "Away team"}
                  className="w-full h-full object-contain"
                />
              </div>
              <Text className={s.teamName}>{match.away_team?.team_name}</Text>
            </div>
            <div className={s.atVs}>
              <div className={s.vs}>@</div>
            </div>
            <div className={`${s.team} ${s.homeTeam}`}>
              <div className={s.teamLogo}>
                <img
                  src={match.home_team?.team_logo?.url || "/placeholder.svg"}
                  alt={match.home_team?.team_name || "Home team"}
                  className="w-full h-full object-contain"
                />
              </div>
              <Text className={s.teamName}>{match.home_team?.team_name}</Text>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
