import type { Metadata, ResolvingMetadata } from "next"
import Heading from "@components/typography/heading"
import contentStyles from "@/styles/content.module.css"
import {
  ForgeCmsMatch,
  findNextUpcomingMatch,
  getAllMatches,
  sortMatchesByDate,
} from "@/lib/forgecms/competition.query"
import { MatchCountdown } from "@/components/competition/countdown"
import s from "./styles.module.css"

interface FormattedMatch {
  id: string
  eventDateTime: string
  league: string
  division: string
  season: string
  matchType: string
  homeTeam: string
  awayTeam: string
  name: string
  homeTeamScore: number
  awayTeamScore: number
  winningTeam: string
}

const MEN_S_D1_FALL_2025 = {
  league: "Men's",
  division: "D1",
  seasonYear: 2025,
  seasonName: "Fall",
} as const

const WOMEN_S_D1_FALL_2025 = {
  league: "Women's",
  division: "D1",
  seasonYear: 2025,
  seasonName: "Fall",
} as const

/** Capitalize a ForgeCMS `match_type` value ("competitive" -> "Competitive"). */
const capitalizeMatchType = (matchType: string) =>
  matchType.charAt(0).toUpperCase() + matchType.slice(1)

/** Format a ForgeCMS match into the archive list's display shape. */
function formatMatch(match: ForgeCmsMatch): FormattedMatch {
  const homeScore = match.home_team_score ?? 0
  const awayScore = match.away_team_score ?? 0

  const winningTeam =
    homeScore > awayScore
      ? match.home_team?.team_name
      : homeScore < awayScore
      ? match.away_team?.team_name
      : "Draw"

  return {
    id: match.id,
    eventDateTime: new Date(match.match_date_time).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    league: match.league?.name || "Unknown League",
    division: match.division?.name || "Unknown Division",
    season: match.season
      ? `${match.season.season} ${match.season.year}`
      : "Unknown Season",
    matchType: capitalizeMatchType(match.match_type || "Unknown Type"),
    homeTeam: match.home_team?.team_name || "TBD",
    awayTeam: match.away_team?.team_name || "TBD",
    name: match.event_name,
    homeTeamScore: homeScore,
    awayTeamScore: awayScore,
    winningTeam: winningTeam || "TBD",
  }
}

/**
 * Generate metadata for the page.
 */
export async function generateMetadata(
  props: { params: Promise<{ slug: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  // Build canonical URL using current URL and slug
  const url = new URL((await parent).metadataBase || "https://pghrugby.com")
  url.pathname = `/matches/all`

  return {
    title: "All Club Matches | Pittsburgh Forge Rugby Club",
    description:
      "A archive listing of all club matches for the Pittsburgh Forge Rugby Club.",
    alternates: {
      canonical: url.toString(),
    },
    openGraph: {
      url: url.toString(),
    },
  } satisfies Metadata
}

export default async function MensSchedule() {
  const matches = await getAllMatches()

  const formattedSchedule = sortMatchesByDate(matches).map(formatMatch)

  const mensCountdownMatch = findNextUpcomingMatch(matches, MEN_S_D1_FALL_2025)
  const womensCountdownMatch = findNextUpcomingMatch(
    matches,
    WOMEN_S_D1_FALL_2025
  )

  return (
    <div className={`${contentStyles.contentBlock} ${s.mensScheduleMain}`}>
      <Heading level="h1">All Pittsburgh Forge Rugby Club Matches</Heading>

      <MatchCountdown match={mensCountdownMatch} />
      <MatchCountdown match={womensCountdownMatch} />

      <ul>
        {formattedSchedule.map((match) => (
          <li key={match.id}>
            <strong>{match.eventDateTime}</strong>: {match.name} (
            {match.homeTeam} vs {match.awayTeam}) - {match.league},{" "}
            {match.division}, {match.season}
            <br />
            <strong>Result:</strong> {match.homeTeamScore} -{" "}
            {match.awayTeamScore}
            <br />
            <strong>Winner:</strong> {match.winningTeam}
          </li>
        ))}
      </ul>
    </div>
  )
}
