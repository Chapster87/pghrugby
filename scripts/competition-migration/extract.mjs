#!/usr/bin/env node
/**
 * Extract and normalize SportsPress competition history (matches + standings)
 * from the public WordPress REST API into a normalized intermediate shape,
 * ready for reconciliation (import chunk 3) and ForgeCMS insertion (import
 * chunk 4) of "Task: Competition migration to ForgeCMS (matches + standings)
 * from WordPress SportsPress".
 *
 * Access method locked in by the chunk-1 research ticket: the public
 * `sportspress/v2` namespace, unauthenticated (see
 * `docs/agents/sportspress-access.md`).
 *
 * Run from the repo root (no env vars needed — the REST surface is public):
 *   node scripts/competition-migration/extract.mjs
 *
 * Writes normalized JSON to `scripts/competition-migration/data/`:
 *   - matches.json   — one record per `sp_event`, source-name-keyed
 *   - standings.json — one record per `sp_table`, source rows preserved
 *   - teams.json     — source team name/slug map (for reconciliation)
 *   - terms.json     — league/season/venue term maps (for reconciliation)
 *
 * Every record keeps its raw source keys (`source`) so reconciliation can
 * trace back to the WordPress post/term IDs. Rerunning the script regenerates
 * identical files (deterministic ordering); it hard-fails on a count mismatch
 * against the source so drift is caught, not silently absorbed.
 */

import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"

const BASE_URL = "https://pghrugby.com/wp-json/sportspress/v2"
const PER_PAGE = 100
const OUT_DIR = join(import.meta.dirname, "data")

// Common WordPress HTML entities seen in REST `title.rendered` payloads.
const ENTITIES = {
  "&#8211;": "–",
  "&ndash;": "–",
  "&#8212;": "—",
  "&mdash;": "—",
  "&#8216;": "‘",
  "&lsquo;": "‘",
  "&#8217;": "’",
  "&rsquo;": "’",
  "&#8220;": "“",
  "&ldquo;": "“",
  "&#8221;": "”",
  "&rdquo;": "”",
  "&#038;": "&",
  "&amp;": "&",
  "&#039;": "'",
  "&apos;": "'",
  "&#8230;": "…",
  "&hellip;": "…",
}

/**
 * Unescapes the HTML entities WordPress sprinkles into rendered titles.
 * @param {string|undefined|null} value - Raw string from the REST API.
 * @returns {string|null} The unescaped string, or null when input is nullish.
 */
function htmlUnescape(value) {
  if (value == null) return null
  return String(value).replace(
    /&(?:#\d+|#x[\da-f]+|\w+);/gi,
    (m) => ENTITIES[m] ?? m
  )
}

/**
 * Coerces a SportsPress stat value ("22", "-", "", 5) to a number or null.
 * @param {string|number|undefined|null} value - Raw stat value.
 * @returns {number|null} Parsed number, or null when blank/unparseable.
 */
function toNumber(value) {
  if (value == null) return null
  if (typeof value === "number") return value
  const s = String(value).trim()
  if (s === "" || s === "-") return null
  const n = Number(s)
  return Number.isNaN(n) ? null : n
}

/**
 * Fetches every row of a `sportspress/v2` collection route, following the
 * documented pagination (build next-page URLs from the sportspress base — the
 * `Link` header is a decoy pointing at `wp/v2`).
 * @param {string} route - Collection route, e.g. "events".
 * @returns {Promise<Array<object>>} All rows across pages.
 */
async function fetchCollection(route) {
  const rows = []
  let page = 1
  let total = null
  for (;;) {
    const res = await fetch(
      `${BASE_URL}/${route}?per_page=${PER_PAGE}&page=${page}`,
      {
        headers: { Accept: "application/json" },
      }
    )
    if (!res.ok) throw new Error(`${route} page ${page} failed (${res.status})`)
    const batch = await res.json()
    if (page === 1) total = Number(res.headers.get("x-wp-total"))
    rows.push(...batch)
    if (batch.length < PER_PAGE) break
    page += 1
  }
  if (total !== null && rows.length !== total) {
    throw new Error(
      `${route}: fetched ${rows.length} rows but X-WP-Total reported ${total}`
    )
  }
  return rows
}

// Source division labels derived from the league term each match/table is
// tagged with. SportsPress has no division taxonomy — the division is encoded
// in the league name ("Midwest Women's D2", "Midwest Premiership - D1 Women").
// ForgeCMS has 6 division records; chunk 3 maps these labels onto them.
// League 522 (Women's Friendly) encodes no division and stays null.
const LEAGUE_DIVISION = {
  569: "D1", // Midwest Men's D1 Playoffs
  514: "D1", // Midwest Premiership - D1 Men
  539: "D1", // Midwest Premiership - D1 Women
  523: "D1", // Midwest Women's D1 Playoffs
  577: "D1", // Women's D1 Nationals
  518: "D2", // Midwest Men's D2
  567: "D2", // Midwest Women's D2
  576: "D2", // Midwest Women's D2 Playoffs
  520: "D3", // Midwest Men's D3
  575: "D3", // Midwest Men's D3 Playoffs
  541: "D4", // Midwest Men's D4
  543: "D4", // Midwest Men's D4 Playoffs
  519: "Div 1 & 2 Hybrid", // Midwest Women's D1 & D2 Hybrid
}

// Source leagues whose matches are friendlies. Everything else is competitive
// (the ForgeCMS `matches.match_type` select carries competitive|friendly — the
// existing row uses "competitive"; playoffs stay competitive).
const FRIENDLY_LEAGUE_IDS = new Set([522])

// Source leagues that intentionally carry no division (friendly fixtures span
// squads; there is no division in the source to preserve).
const NO_DIVISION_LEAGUE_IDS = new Set([522])

/**
 * Resolves the derived division label for an event/table's league IDs.
 * @param {number[]} leagueIds - Source `sp_league` term IDs.
 * @param {string[]} warnings - Mutable warning list (unknown leagues).
 * @returns {string|null} Division label, or null when none derivable.
 */
function divisionFor(leagueIds, warnings) {
  for (const id of leagueIds) {
    const label = LEAGUE_DIVISION[id]
    if (label) return label
    if (!NO_DIVISION_LEAGUE_IDS.has(id)) {
      warnings.push(`league ${id} has no division mapping`)
    }
  }
  return null
}

/**
 * Resolves the derived match type for an event's league IDs.
 * @param {number[]} leagueIds - Source `sp_league` term IDs.
 * @returns {string} "friendly" or "competitive".
 */
function matchTypeFor(leagueIds) {
  return leagueIds.some((id) => FRIENDLY_LEAGUE_IDS.has(id))
    ? "friendly"
    : "competitive"
}

/**
 * Resolves a team's score from `results` (points by team ID), falling back to
 * the positional `main_results` column. Unplayed matches return null.
 * @param {object|undefined} results - `results` map from the event.
 * @param {Array<string|number>|undefined} mainResults - `main_results` array.
 * @param {number} teamId - Source `sp_team` post ID.
 * @param {number} index - Position of the team in `teams` (matches main_results).
 * @returns {number|null} Score, or null when the match has no recorded result.
 */
function scoreFor(results, mainResults, teamId, index) {
  const points = results?.[teamId]?.points
  if (points != null && points !== "") return toNumber(points)
  const fallback = mainResults?.[index]
  return fallback != null && fallback !== "" ? toNumber(fallback) : null
}

/**
 * Resolves the display name of a source row: posts carry `title.rendered`
 * (events/tables/teams), taxonomy terms carry `name` (leagues/seasons/venues).
 * @param {object} row - Raw REST row.
 * @returns {string|null} Unescaped name, or null when neither field is present.
 */
function termName(row) {
  return htmlUnescape(row.title?.rendered ?? row.name)
}

/**
 * Joins a list of source IDs into their names ("2025 Fall, 2024 Spring").
 * @param {number[]} ids - Source term/post IDs.
 * @param {Map<number, string>} names - ID → name map.
 * @returns {string|null} Comma-joined names; null when empty; unknown IDs render as "#<id>".
 */
function namesFor(ids, names) {
  if (!ids.length) return null
  return ids.map((id) => names.get(id) ?? `#${id}`).join(", ")
}

/**
 * Normalizes `sp_event` rows into the matches intermediate shape.
 * @param {Array<object>} events - Raw events from the REST API.
 * @param {Map<number, string>} teamNames - Source team ID → name.
 * @param {Map<number, string>} leagueNames - Source league term ID → name.
 * @param {Map<number, string>} seasonNames - Source season term ID → name.
 * @param {Map<number, string>} venueNames - Source venue term ID → name.
 * @param {string[]} warnings - Mutable warning list.
 * @returns {Array<object>} Normalized match records, sorted by kickoff.
 */
function normalizeMatches(
  events,
  teamNames,
  leagueNames,
  seasonNames,
  venueNames,
  warnings
) {
  return events
    .map((event) => {
      const [homeId, awayId] = event.teams
      const dateGmt = event.date_gmt ? `${event.date_gmt}Z` : null
      const leagueIds = event.leagues ?? []
      const seasonIds = event.seasons ?? []
      return {
        match_date_time: dateGmt ? new Date(dateGmt).toISOString() : null,
        league: namesFor(leagueIds, leagueNames),
        division: divisionFor(leagueIds, warnings),
        season: namesFor(seasonIds, seasonNames),
        match_type: matchTypeFor(leagueIds),
        home_team: htmlUnescape(teamNames.get(homeId) ?? null),
        away_team: htmlUnescape(teamNames.get(awayId) ?? null),
        event_name: htmlUnescape(event.title?.rendered),
        slug: event.slug ?? null,
        home_team_score: scoreFor(event.results, event.main_results, homeId, 0),
        away_team_score: scoreFor(event.results, event.main_results, awayId, 1),
        source: {
          event_id: event.id,
          link: event.link ?? null,
          status: event.status ?? null,
          minutes: event.minutes ?? null,
          date: event.date ?? null,
          date_gmt: event.date_gmt ?? null,
          team_ids: { home: homeId, away: awayId },
          league_ids: leagueIds,
          season_ids: seasonIds,
          venue_ids: event.venues ?? [],
          winner: event.winner ?? null,
          outcome:
            event.outcome && !Array.isArray(event.outcome)
              ? event.outcome
              : null,
        },
      }
    })
    .sort(
      (a, b) =>
        (a.match_date_time ?? "").localeCompare(b.match_date_time ?? "") ||
        a.source.event_id - b.source.event_id
    )
}

/**
 * Normalizes `sp_table` rows into the standings intermediate shape, preserving
 * the full source row so chunk 4 can reshape into the ForgeCMS standings_table
 * JSON (whose tie column is `t`, not the source's `d`).
 * @param {Array<object>} tables - Raw tables from the REST API.
 * @param {Map<number, string>} leagueNames - Source league term ID → name.
 * @param {Map<number, string>} seasonNames - Source season term ID → name.
 * @param {string[]} warnings - Mutable warning list.
 * @returns {Array<object>} Normalized standings records, sorted by slug.
 */
function normalizeStandings(tables, leagueNames, seasonNames, warnings) {
  return tables
    .map((table) => {
      const leagueIds = table.leagues ?? []
      const seasonIds = table.seasons ?? []
      const rows = Object.entries(table.data ?? {})
        .filter(([key]) => key !== "0") // "0" is the SportsPress header template
        .map(([teamId, row]) => ({
          source_team_id: Number(teamId),
          name: htmlUnescape(row.name),
          pos: toNumber(row.pos),
          gp: toNumber(row.gp),
          w: toNumber(row.w),
          l: toNumber(row.l),
          d: toNumber(row.d),
          pf: toNumber(row.pf),
          pa: toNumber(row.pa),
          pd: toNumber(row.pd),
          bt: toNumber(row.bt),
          bl: toNumber(row.bl),
          ff: toNumber(row.ff),
          pts: toNumber(row.pts),
          lppg: toNumber(row.lppg),
        }))
        .sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0))
      return {
        season: namesFor(seasonIds, seasonNames),
        league: namesFor(leagueIds, leagueNames),
        division: divisionFor(leagueIds, warnings),
        slug: table.slug ?? null,
        standings_table: rows,
        source: {
          table_id: table.id,
          link: table.link ?? null,
          status: table.status ?? null,
          date: table.date ?? null,
          league_ids: leagueIds,
          season_ids: seasonIds,
        },
      }
    })
    .sort((a, b) => a.slug?.localeCompare(b.slug ?? "") ?? 0)
}

/**
 * Builds ID → name maps from the companion collection routes.
 * @param {Array<object>} terms - Raw term/post rows (leagues, seasons, venues, teams).
 * @returns {Map<number, string>} ID → unescaped name.
 */
function nameMap(terms) {
  return new Map(terms.map((t) => [t.id, termName(t)]))
}

/**
 * Serializes a value to deterministic, human-readable JSON with a trailing
 * newline (stable key order — objects are built in a fixed shape above).
 * @param {unknown} value - Value to serialize.
 * @returns {string} JSON text.
 */
function toJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

// --- Fetch everything -------------------------------------------------------

const [events, tables, teams, leagues, seasons, venues] = await Promise.all([
  fetchCollection("events"),
  fetchCollection("tables"),
  fetchCollection("teams"),
  fetchCollection("leagues"),
  fetchCollection("seasons"),
  fetchCollection("venues"),
])

const teamNames = nameMap(teams)
const leagueNames = nameMap(leagues)
const seasonNames = nameMap(seasons)
const venueNames = nameMap(venues)

// --- Normalize --------------------------------------------------------------

const warnings = []
const matches = normalizeMatches(
  events,
  teamNames,
  leagueNames,
  seasonNames,
  venueNames,
  warnings
)
const standings = normalizeStandings(tables, leagueNames, seasonNames, warnings)

const teamsOut = teams
  .map((t) => ({
    source_team_id: t.id,
    name: termName(t),
    slug: t.slug ?? null,
    abbreviation: htmlUnescape(t.abbreviation) || null,
    league_ids: t.leagues ?? [],
    season_ids: t.seasons ?? [],
  }))
  .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""))

const termsOut = {
  leagues: leagues
    .map((t) => ({ id: t.id, name: termName(t), slug: t.slug }))
    .sort((a, b) => a.id - b.id),
  seasons: seasons
    .map((t) => ({ id: t.id, name: termName(t), slug: t.slug }))
    .sort((a, b) => a.id - b.id),
  venues: venues
    .map((t) => ({ id: t.id, name: termName(t), slug: t.slug }))
    .sort((a, b) => a.id - b.id),
}

// --- Verify -----------------------------------------------------------------

const scored = matches.filter(
  (m) => m.home_team_score != null && m.away_team_score != null
)
const withVenue = matches.filter((m) => m.source.venue_ids.length > 0)
const distinctTeamIds = new Set(
  matches.flatMap((m) => [m.source.team_ids.home, m.source.team_ids.away])
)
const distinctLeagueIds = new Set(matches.flatMap((m) => m.source.league_ids))
const distinctSeasonIds = new Set(matches.flatMap((m) => m.source.season_ids))
const tablesWithContext = standings.filter((s) => s.league && s.season)
const genericTables = standings.filter((s) => !s.league && !s.season)
const tableRows = standings.reduce((n, s) => n + s.standings_table.length, 0)

console.log("=== SOURCE COUNTS ===")
console.log(`events:   ${events.length} (X-WP-Total ${events.length})`)
console.log(`tables:   ${tables.length} (X-WP-Total ${tables.length})`)
console.log(`teams:    ${teams.length}`)
console.log(
  `leagues:  ${leagues.length}, seasons: ${seasons.length}, venues: ${venues.length}`
)

console.log("\n=== MATCHES ===")
console.log(
  `total ${matches.length}, scored ${scored.length}, unscored ${
    matches.length - scored.length
  }`
)
console.log(
  `distinct teams ${distinctTeamIds.size}, leagues ${distinctLeagueIds.size}, seasons ${distinctSeasonIds.size}`
)
console.log(
  `with venue ${withVenue.length}, missing venue ${
    matches.length - withVenue.length
  }`
)
console.log(`with division label ${matches.filter((m) => m.division).length}`)

console.log("\n=== STANDINGS ===")
console.log(
  `total ${standings.length} (${tablesWithContext.length} with league+season, ${genericTables.length} generic)`
)
console.log(`rows across tables: ${tableRows}`)

if (warnings.length) {
  console.log("\n=== WARNINGS ===")
  for (const warning of warnings) console.log(`- ${warning}`)
}

// --- Write ------------------------------------------------------------------

await mkdir(OUT_DIR, { recursive: true })
await Promise.all([
  writeFile(join(OUT_DIR, "matches.json"), toJson(matches)),
  writeFile(join(OUT_DIR, "standings.json"), toJson(standings)),
  writeFile(join(OUT_DIR, "teams.json"), toJson(teamsOut)),
  writeFile(join(OUT_DIR, "terms.json"), toJson(termsOut)),
])
console.log(`\nWrote ${OUT_DIR}/`)
