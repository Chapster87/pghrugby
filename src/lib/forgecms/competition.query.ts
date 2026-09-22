// ForgeCMS competition queries (matches + schedules).
// Replaces the Sanity `match` / `team` / `season` document reads behind
// matches/all, the schedule tables, the countdown, and the sidebar matches
// widget.
//
// The CDA exposes collections via `<plural>Collection { edges { node { … } } }`.
// `where` only supports
// exact-match scalar fields — nested relation filters silently return empty —
// and there is no ordering argument, so the app filters and sorts in JS. The
// full history is ~127 rows; fetching it wholesale and narrowing client-side
// is cheaper and more robust than composing filters the API can't express.

import { executeQuery } from "./execute-query"

export const matchesQuery = `
  query MatchesQuery {
    matchesCollection {
      edges {
        node {
          id
          event_name
          match_date_time
          match_type
          slug
          home_team_score
          away_team_score
          league {
            name
            slug
            short_name
          }
          division {
            name
            slug
            short_name
          }
          season {
            year
            season
            display_name
          }
          home_team {
            team_name
            short_name
            slug
            team_logo {
              url
            }
          }
          away_team {
            team_name
            short_name
            slug
            team_logo {
              url
            }
          }
        }
      }
    }
  }
`

export interface ForgeCmsTeam {
  team_name: string
  short_name?: string | null
  slug?: string | null
  team_logo?: { url?: string | null } | null
}

export interface ForgeCmsMatch {
  id: string
  event_name: string
  match_date_time: string
  match_type: string
  slug: string
  home_team_score: number | null
  away_team_score: number | null
  league?: { name: string; slug: string; short_name?: string | null } | null
  division?: { name: string; slug: string; short_name?: string | null } | null
  season?: { year: number; season: string; display_name: string } | null
  home_team?: ForgeCmsTeam | null
  away_team?: ForgeCmsTeam | null
}

/** Identifies a schedule/countdown surface: league + division + season. */
export interface MatchFilter {
  league: string
  division: string
  seasonYear: number
  seasonName: string
}

/**
 * Fetches every ForgeCMS match with its resolved league, division, season, and
 * team (with logo) references. The collection is small (~127 rows), so the app
 * filters and sorts in JS rather than relying on `where` (scalar-only) or an
 * ordering argument (none exists). Cached under the shared `cms-content` tag.
 * @returns All matches, unordered as returned by the API.
 */
export async function getAllMatches(): Promise<ForgeCmsMatch[]> {
  const data = await executeQuery<{
    matchesCollection: { edges: Array<{ node: ForgeCmsMatch }> }
  }>(matchesQuery)
  return (data.matchesCollection?.edges ?? []).map((edge) => edge.node)
}

/**
 * Sorts matches by kickoff time, oldest first.
 * @param matches - The matches to sort (not mutated).
 * @returns A new array sorted by `match_date_time` ascending.
 */
export function sortMatchesByDate(matches: ForgeCmsMatch[]): ForgeCmsMatch[] {
  return [...matches].sort(
    (a, b) =>
      new Date(a.match_date_time).getTime() -
      new Date(b.match_date_time).getTime()
  )
}

/**
 * Narrow matches to one league/division/season surface. Matches the fields the
 * legacy Sanity GROQ filtered on: league `short_name`, division `short_name`,
 * season `year` + `season` (e.g. "Men's" / "D1" / 2025 / "Fall").
 * @param matches - The full match list.
 * @param filter - The surface to select (see {@link MatchFilter}).
 * @returns The matching matches, unsorted.
 */
export function filterMatchesByLeagueDivisionSeason(
  matches: ForgeCmsMatch[],
  filter: MatchFilter
): ForgeCmsMatch[] {
  return matches.filter(
    (match) =>
      match.league?.short_name === filter.league &&
      match.division?.short_name === filter.division &&
      match.season?.year === filter.seasonYear &&
      match.season?.season === filter.seasonName
  )
}

/**
 * Finds the next upcoming match for a surface — the soonest fixture that has
 * not kicked off yet (equivalent to the legacy GROQ's
 * `eventDateTime >= now() | order(eventDateTime asc)[0...1]`).
 * @param matches - The full match list.
 * @param filter - The surface to select (see {@link MatchFilter}).
 * @returns The next upcoming match, or null when none is scheduled.
 */
export function findNextUpcomingMatch(
  matches: ForgeCmsMatch[],
  filter: MatchFilter
): ForgeCmsMatch | null {
  const now = Date.now()
  const upcoming = filterMatchesByLeagueDivisionSeason(matches, filter)
    .filter((match) => new Date(match.match_date_time).getTime() >= now)
    .sort(
      (a, b) =>
        new Date(a.match_date_time).getTime() -
        new Date(b.match_date_time).getTime()
    )
  return upcoming[0] ?? null
}
