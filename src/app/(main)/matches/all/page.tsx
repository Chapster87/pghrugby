import type { Metadata, ResolvingMetadata } from "next"
import Link from "@components/link"
import Heading from "@components/typography/heading"
import contentStyles from "@/styles/content.module.css"
import s from "./styles.module.css"
import { client } from "@/sanity/lib/client"
import { scheduleQuery } from "./schedule.query"

interface Match {
  _id: string
  eventDateTime: string
  league?: { name: string }
  division?: { name: string }
  season?: { _id: string; year: number; season: string }
  matchType?: string
  homeTeam?: {
    _id: string
    teamName?: string
    league?: string
    division?: string
  }
  awayTeam?: {
    _id: string
    teamName?: string
    league?: string
    division?: string
  }
  name: string
  homeTeamScore?: number
  awayTeamScore?: number
}

/**
 * Generate metadata for the page.
 */
export async function generateMetadata(
  props: { params: { slug: string } },
  parent: ResolvingMetadata
): Promise<Metadata> {
  // Build canonical URL using current URL and slug
  const url = new URL((await parent).metadataBase || "https://pghrugby.com")
  url.pathname = `/links`

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
  const schedule: Match[] = await client.fetch(scheduleQuery)

  const formattedSchedule = await Promise.all(
    schedule.map(async (match) => {
      const homeTeam =
        match.homeTeam?._id &&
        (await client.fetch(
          `*[_type == "team" && _id == $id][0]{teamName, "league": league->shortName, "division": division->shortName}`,
          { id: match.homeTeam._id }
        ))

      const awayTeam =
        match.awayTeam?._id &&
        (await client.fetch(
          `*[_type == "team" && _id == $id][0]{teamName, "league": league->shortName, "division": division->shortName}`,
          { id: match.awayTeam._id }
        ))

      const season =
        match.season?._id &&
        (await client.fetch(
          `*[_type == "season" && _id == $id][0]{year, season}`,
          { id: match.season._id }
        ))

      const homeScore = match.homeTeamScore ?? 0
      const awayScore = match.awayTeamScore ?? 0

      const winningTeam =
        homeScore > awayScore
          ? homeTeam?.teamName
          : homeScore < awayScore
          ? awayTeam?.teamName
          : "Draw"

      return {
        id: match._id,
        eventDateTime: new Date(match.eventDateTime).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
        league: match.league?.name || "Unknown League",
        division: match.division?.name || "Unknown Division",
        season: season ? `${season.season} ${season.year}` : "Unknown Season",
        matchType: match.matchType || "Unknown Type",
        homeTeam: homeTeam?.teamName || "TBD",
        awayTeam: awayTeam?.teamName || "TBD",
        name: match.name,
        homeTeamScore: homeScore,
        awayTeamScore: awayScore,
        winningTeam,
      }
    })
  )

  return (
    <div className={`${contentStyles.contentMain} ${s.mensScheduleMain}`}>
      <Heading level="h1">All Pittsburgh Forge Rugby Club Matches</Heading>

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
