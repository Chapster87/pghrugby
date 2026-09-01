#!/usr/bin/env node
/**
 * Reconcile the normalized SportsPress competition data to existing ForgeCMS
 * records (import chunk 3 of 7).
 *
 * Consumes chunk 2's intermediate data (`scripts/competition-migration/data/`:
 * matches.json, standings.json, teams.json, terms.json) and the live ForgeCMS
 * tables (teams: 60, leagues: 3, seasons: 5, divisions: 6) and produces a
 * deterministic mapping:
 *
 *   - `data/reconciliation.json` — every source key resolved to a ForgeCMS
 *     record id, or flagged unmatched with a reason. Chunk 4 reads this to
 *     resolve match/standings FKs without ever creating duplicates.
 *   - `docs/handoffs/competition-reconciliation.md` — the unmatched report +
 *     verification (the human-facing handoff).
 *
 * Resolution rules (all deterministic — see the report for the full rationale):
 *   - **Leagues** fold onto the 3 ForgeCMS leagues by gender (14 source
 *     leagues); Women's Friendly is a women's league, so it lands on Midwest
 *     Women's Rugby. The ForgeCMS `Non-League` record has no source
 *     counterpart and stays unused.
 *   - **Divisions** map label → ForgeCMS division (D1 → Premiership (Div 1),
 *     D2/D3/D4, Div 1 & 2 Hybrid). The 8 Women's Friendly matches carry no
 *     source division and resolve to the Friendly division (owner decision,
 *     issue 38).
 *   - **Seasons** map by name 1:1; event 4816 is dual-tagged (2023 Fall +
 *     2024 Spring) and resolves to 2024 Spring by its match date
 *     (2024-05-17).
 *   - **Teams** resolve per `source_team_id`. Akron RFC (4134) spans the
 *     men's and women's sides in the source, so it resolves by the record's
 *     league gender (context). Two source teams are unmatched by design —
 *     Harrisburg Rugby Club (4094, legacy duplicate) and Detroit Tradesmen D3
 *     (4520, no ForgeCMS D3 record); both only ever appear in the generic
 *     table 3900 that chunk 4 skips.
 *
 * Run from the repo root (needs `.env.local` — Supabase service role):
 *   node --env-file=.env.local scripts/competition-migration/reconcile.mjs
 *   # or: pnpm competition:reconcile
 *
 * Hard-fails (exit 1) on any verification mismatch; the report is only
 * written when every check passes, so it never goes stale.
 */

import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { select } from "../lib/supabase.mjs"

const DATA_DIR = join(import.meta.dirname, "data")
const REPORT_PATH = join(
  import.meta.dirname,
  "..",
  "..",
  "docs",
  "handoffs",
  "competition-reconciliation.md"
)

/** Loads a normalized intermediate data file from chunk 2. */
async function loadData(name) {
  return JSON.parse(await readFile(join(DATA_DIR, name), "utf8"))
}

// Source league gender — deterministic from the league term names.
// 522 (Women's Friendly) is a women's league; 577 (Women's D1 Nationals) too.
const LEAGUE_GENDER = {
  514: "men", // Midwest Premiership - D1 Men
  518: "men", // Midwest Men's D2
  520: "men", // Midwest Men's D3
  541: "men", // Midwest Men's D4
  543: "men", // Midwest Men's D4 Playoffs
  569: "men", // Midwest Men's D1 Playoffs
  575: "men", // Midwest Men's D3 Playoffs
  519: "women", // Midwest Women's D1 & D2 Hybrid
  522: "women", // Women's Friendly
  523: "women", // Midwest Women's D1 Playoffs
  539: "women", // Midwest Premiership - D1 Women
  567: "women", // Midwest Women's D2
  576: "women", // Midwest Women's D2 Playoffs
  577: "women", // Women's D1 Nationals
}

// Derived division label per league (mirrors extract.mjs LEAGUE_DIVISION).
const LEAGUE_DIVISION = {
  569: "D1",
  514: "D1",
  539: "D1",
  523: "D1",
  577: "D1",
  518: "D2",
  567: "D2",
  576: "D2",
  520: "D3",
  575: "D3",
  541: "D4",
  543: "D4",
  519: "Div 1 & 2 Hybrid",
}

/** Source leagues whose matches are friendlies (no division, match_type friendly). */
const FRIENDLY_LEAGUE_IDS = new Set([522])

// Division label -> ForgeCMS division slug.
const DIVISION_LABELS = {
  D1: "div_1",
  D2: "division_2",
  D3: "division_3",
  D4: "division_4",
  "Div 1 & 2 Hybrid": "div-1-2-hybrid",
}

// The 8 Women's Friendly matches carry no source division; the owner decided
// (issue 38, revised) they land on a dedicated Friendly division record.
const FRIENDLY_DIVISION_SLUG = "friendly"

// Season source id -> ForgeCMS season slug (1:1 by name).
const SEASON_SLUGS = {
  515: "2022-fall",
  538: "2023-fall",
  557: "2024-spring",
  568: "2024-fall",
  574: "2025-fall",
}

// Event 4816 (Forge Women D1 @ Utah Vipers, Women's D1 Nationals) is tagged
// with two seasons (2023 Fall + 2024 Spring); the match date (2024-05-17)
// picks 2024 Spring (source id 557).
const SEASON_OVERRIDES = { 4816: 557 }

/**
 * Explicit source team -> ForgeCMS target map.
 *
 * Target shapes:
 *   { slug }                          — match a ForgeCMS team by slug
 *   { name, league }                  — match by name + league slug (the
 *                                       slug-less "Pittsburgh Forge" records)
 *   { byLeagueGender: { men, women } }— resolve by the record's league gender
 *   null                              — unmatched (reason recorded below)
 */
const TEAM_TARGETS = {
  // --- men's teams ---
  3894: { name: "Pittsburgh Forge", league: "midwest-mens-rugby" }, // Forge D1 Men (slug-less record)
  3909: { slug: "pittsburgh-forge-d2-men" },
  3912: { slug: "pittsburgh-forge-d3-men" },
  4510: { slug: "pittsburgh-forge-d4-men" },
  3907: { slug: "indianapolis-impalas-d2" },
  5442: { slug: "indianapolis-impalas" },
  5105: { slug: "indianapolis-impalas-d4" },
  3921: { slug: "chicago-rugby-club" },
  4015: { slug: "chicago-lions-men" },
  4017: { slug: "cleveland-crusaders" },
  4025: { slug: "cleveland-crusaders-d3" },
  4024: { slug: "cincinnati-wolfhounds" },
  5645: { slug: "cincinnati-kelts-men" },
  4027: { slug: "detroit-tradesmen" },
  4520: null, // unmatched — no ForgeCMS D3 record
  4521: { slug: "detroit-rugby-football-club-men" },
  4137: { slug: "cleveland-rovers-rfc-d3" },
  4527: { slug: "cleveland-rovers-rfc-d4" },
  4522: { slug: "columbus-in-rfc" },
  4528: { slug: "columbus-castaways-d4" },
  5647: { slug: "columbus-coyotes" },
  4133: { slug: "columbus-rugby-club" },
  4526: { slug: "dayton-area-rugby-club-men" },
  4576: { slug: "canton-rugby" },
  4581: { slug: "findlay-rfc" },
  4669: { slug: "westside-outcasts" },
  5020: { slug: "ypsilanti-rugby-club" },
  4517: { slug: "marysville-rfc" },
  4136: { slug: "south-pitt" }, // source "South Pittsburgh Hooligans RFC D3"
  5636: { slug: "south-pitt-d4" },
  4139: { slug: "greensburg-rfc" },
  4135: { slug: "presque-isle-rfc" },
  4132: { slug: "queen-city-rugby-club" },
  5445: { slug: "pittsburgh-harlequins" },
  5443: { slug: "erie-rfc" },
  4097: { slug: "harrisburg-rugby-club-men" },
  4094: null, // unmatched — legacy duplicate of 4097
  4134: {
    byLeagueGender: {
      men: { slug: "akron-rfc-men" },
      women: { slug: "akron-rfc-women" },
    },
  },
  // --- women's teams ---
  3913: { name: "Pittsburgh Forge", league: "midwest-womens-rugby" }, // Forge D1 Women (slug-less record)
  4973: { slug: "pittsburgh-forge-d2-women" },
  3918: { slug: "pittsburgh-forge-women-gold" },
  3914: { slug: "buffalo-womens-rugby-club" },
  4112: { slug: "chicago-lions-women" },
  5649: { slug: "chicago-north-shore" },
  3957: { slug: "columbus-womens-rugby" },
  3959: { slug: "cincinnati-kelts-womens-rugby" },
  3963: { slug: "detroit-rugby-football-club-women" },
  4101: { slug: "cleveland-iron-maidens" },
  5635: { slug: "dayton-area-rugby-club-women" },
  4674: { slug: "ucwrfc" },
  4828: { slug: "utah-vipers" },
  4990: { slug: "rochester-renegades" },
  5013: { slug: "north-buffalo-ninjas" },
  5016: { slug: "uticuse-rugby-club" },
  5018: { slug: "south-buffalo-rugby" },
  5107: { slug: "st-louis-bombers" },
  5112: { slug: "metropolis-valkyries" },
  5430: { slug: "grand-rapids-growlers" },
  4106: { slug: "kent-state-womens-rugby-club" },
  4815: { name: "TBD" }, // placeholder team (slug-less record)
  4098: { slug: "harrisburg-rugby-club-women" },
}

/** Unmatched source team ids -> reason (kept next to the map for auditing). */
const UNMATCHED_REASONS = {
  4094:
    "Legacy duplicate — the source carries two records for the same men's club " +
    '(4094 "Harrisburg Rugby Club" and 4097 "Harrisburg Rugby Club Men"); ' +
    "4097 matches the ForgeCMS record exactly, 4094 is the generic predecessor. " +
    "Gender-ambiguous and present only in the skipped generic table 3900, so no " +
    "real row needs it — never duplicate the ForgeCMS Harrisburg Men record.",
  4520:
    "No ForgeCMS record — ForgeCMS has Detroit Tradesmen (D1) only; the source " +
    "D3 squad has no D3 counterpart. Present only in the skipped generic table " +
    "3900, so no real row needs it.",
}

// Generic catch-all table (no league/season, junk stats) — chunk 4 skips it.
const SKIPPED_TABLES = new Set([3900])

/** Source team id -> teams.json record. */
function indexSourceTeams(teams) {
  return new Map(teams.map((t) => [t.source_team_id, t]))
}

/** ForgeCMS rows indexed by slug, and by (team_name) for the slug-less records. */
function indexForgecmsTeams(rows) {
  const bySlug = new Map()
  const byName = new Map()
  for (const row of rows) {
    if (row.slug) bySlug.set(row.slug, row)
    if (!byName.has(row.team_name)) byName.set(row.team_name, [])
    byName.get(row.team_name).push(row)
  }
  return { bySlug, byName }
}

/**
 * Resolves the gender of a set of source league ids.
 * @param {number[]} leagueIds - Source `sp_league` term ids.
 * @returns {"men"|"women"|null} The common gender, or null when no league
 *   (or mixed genders — which would be a source data problem).
 */
function genderFor(leagueIds) {
  const genders = new Set(
    leagueIds.map((id) => LEAGUE_GENDER[id]).filter(Boolean)
  )
  if (genders.size === 0) return null
  if (genders.size > 1) {
    throw new Error(
      `mixed-gender league ids in one record: ${leagueIds.join(", ")}`
    )
  }
  return [...genders][0]
}

/**
 * Finds the ForgeCMS team a target descriptor points at.
 * @param {object} target - `{ slug }` or `{ name, league? }`.
 * @param {object} index - `{ bySlug, byName }` from indexForgecmsTeams.
 * @param {Map<string, object>} leagueBySlug - ForgeCMS league slug -> row.
 * @returns {object} The ForgeCMS team row.
 */
function findForgecmsTeam(target, index, leagueBySlug) {
  if (target.slug) {
    const row = index.bySlug.get(target.slug)
    if (!row) throw new Error(`ForgeCMS team slug not found: ${target.slug}`)
    return row
  }
  let candidates = index.byName.get(target.name) ?? []
  if (target.league) {
    const leagueId = leagueBySlug.get(target.league)?.id
    if (!leagueId)
      throw new Error(`ForgeCMS league slug not found: ${target.league}`)
    candidates = candidates.filter((row) => row.league?.includes(leagueId))
  }
  if (candidates.length === 1) return candidates[0]
  throw new Error(
    `ForgeCMS team lookup ambiguous/not found for ${target.name} (league ${
      target.league ?? "any"
    }): ` + `${candidates.length} candidate(s)`
  )
}

/**
 * Resolves a source team for a record with league context.
 * @param {object} sourceTeam - teams.json record.
 * @param {number[]} leagueIds - The record's source league ids.
 * @param {object} index - ForgeCMS team index.
 * @param {Map<string, object>} leagueBySlug - ForgeCMS league slug -> row.
 * @returns {{ status: "resolved", team: object }|{ status: "unmatched" }}
 */
function resolveTeam(sourceTeam, leagueIds, index, leagueBySlug) {
  const target = TEAM_TARGETS[sourceTeam.source_team_id]
  if (target === undefined) {
    throw new Error(
      `no TEAM_TARGETS entry for source team ${sourceTeam.source_team_id}`
    )
  }
  if (target === null) return { status: "unmatched" }
  if (target.byLeagueGender) {
    const gender = genderFor(leagueIds)
    if (!gender) return { status: "unmatched" }
    return {
      status: "resolved",
      team: findForgecmsTeam(
        target.byLeagueGender[gender],
        index,
        leagueBySlug
      ),
    }
  }
  return {
    status: "resolved",
    team: findForgecmsTeam(target, index, leagueBySlug),
  }
}

/** Renders a markdown table row, padding cells for readability. */
function row(cells, widths) {
  return (
    "| " + cells.map((c, i) => String(c).padEnd(widths[i])).join(" | ") + " |"
  )
}

async function main() {
  const [matches, standings, sourceTeams, terms] = await Promise.all([
    loadData("matches.json"),
    loadData("standings.json"),
    loadData("teams.json"),
    loadData("terms.json"),
  ])

  const [forgecmsLeagues, forgecmsDivisions, forgecmsSeasons, forgecmsTeams] =
    await Promise.all([
      select("leagues", "select=*"),
      select("divisions", "select=*"),
      select("seasons", "select=*"),
      select("teams", "select=*"),
    ])

  const leagueBySlug = new Map(forgecmsLeagues.map((l) => [l.slug, l]))
  const divisionBySlug = new Map(forgecmsDivisions.map((d) => [d.slug, d]))
  const seasonBySlug = new Map(forgecmsSeasons.map((s) => [s.slug, s]))
  const teamIndex = indexForgecmsTeams(forgecmsTeams)
  const sourceTeamById = indexSourceTeams(sourceTeams)

  const leagueNameById = new Map(terms.leagues.map((l) => [l.id, l.name]))
  const seasonNameById = new Map(terms.seasons.map((s) => [s.id, s.name]))

  // --- leagues: 14 source -> 3 ForgeCMS -------------------------------------
  const leagueMap = {}
  for (const league of terms.leagues) {
    const gender = LEAGUE_GENDER[league.id]
    if (!gender) throw new Error(`no LEAGUE_GENDER for league ${league.id}`)
    const target = leagueBySlug.get(
      gender === "men" ? "midwest-mens-rugby" : "midwest-womens-rugby"
    )
    leagueMap[league.id] = {
      source_name: league.name,
      forgecms_id: target.id,
      forgecms_name: target.name,
      status: "resolved",
      reason: `${gender === "men" ? "men's" : "women's"} competition (${
        league.name
      })`,
    }
  }

  // --- divisions: labels -> 6 records ----------------------------------------
  const divisionMap = {}
  for (const [label, slug] of Object.entries(DIVISION_LABELS)) {
    const target = divisionBySlug.get(slug)
    divisionMap[label] = {
      forgecms_id: target.id,
      forgecms_name: target.name,
      status: "resolved",
    }
  }
  const friendlyDivision = divisionBySlug.get(FRIENDLY_DIVISION_SLUG)
  divisionMap["(friendly)"] = {
    forgecms_id: friendlyDivision.id,
    forgecms_name: friendlyDivision.name,
    status: "resolved",
    reason:
      "owner decision (issue 38): Women's Friendly matches use the Friendly division",
  }

  // --- seasons: 5 source -> 5 records -----------------------------------------
  const seasonMap = {}
  for (const season of terms.seasons) {
    const target = seasonBySlug.get(SEASON_SLUGS[season.id])
    seasonMap[season.id] = {
      source_name: season.name,
      forgecms_id: target.id,
      forgecms_name: target.display_name,
      status: "resolved",
    }
  }

  // --- teams: 61 source -> ForgeCMS records ----------------------------------
  const teamMap = {}
  const targetUsage = new Map() // forgecms team id -> source team ids (injectivity)
  for (const sourceTeam of sourceTeams) {
    const entry = { source_name: sourceTeam.name }
    const target = TEAM_TARGETS[sourceTeam.source_team_id]
    if (target === null) {
      entry.status = "unmatched"
      entry.reason = UNMATCHED_REASONS[sourceTeam.source_team_id] ?? "unmatched"
      teamMap[sourceTeam.source_team_id] = entry
      continue
    }
    if (target.byLeagueGender) {
      entry.status = "context"
      entry.reason =
        "one source team spans the men's and women's sides — resolve per record " +
        "by the record's league gender"
      entry.by_league_gender = {}
      for (const [gender, t] of Object.entries(target.byLeagueGender)) {
        const team = findForgecmsTeam(t, teamIndex, leagueBySlug)
        entry.by_league_gender[gender] = {
          forgecms_id: team.id,
          forgecms_name: team.team_name,
        }
        targetUsage.set(team.id, [
          ...(targetUsage.get(team.id) ?? []),
          sourceTeam.source_team_id,
        ])
      }
      teamMap[sourceTeam.source_team_id] = entry
      continue
    }
    const team = findForgecmsTeam(target, teamIndex, leagueBySlug)
    entry.status = "resolved"
    entry.forgecms_id = team.id
    entry.forgecms_name = team.team_name
    if (target.slug && target.slug !== team.slug) {
      entry.reason = `matched by slug ${target.slug}`
    } else if (!target.slug) {
      entry.reason = `matched by name (${target.name})${
        target.league ? " + league" : ""
      }`
    }
    teamMap[sourceTeam.source_team_id] = entry
    targetUsage.set(team.id, [
      ...(targetUsage.get(team.id) ?? []),
      sourceTeam.source_team_id,
    ])
  }

  // --- row-level verification ------------------------------------------------
  const matchFailures = []
  const multiSeasonEvents = []
  const unknownLeagueIds = new Set()

  for (const m of matches) {
    const leagueIds = m.source.league_ids
    for (const id of leagueIds) {
      if (!LEAGUE_GENDER[id]) unknownLeagueIds.add(id)
    }
    if (m.source.season_ids.length > 1)
      multiSeasonEvents.push(m.source.event_id)
    for (const side of ["home", "away"]) {
      const id = m.source.team_ids[side]
      const sourceTeam = sourceTeamById.get(id)
      if (!sourceTeam) {
        matchFailures.push(
          `match ${m.source.event_id}: unknown source team id ${id}`
        )
        continue
      }
      const res = resolveTeam(sourceTeam, leagueIds, teamIndex, leagueBySlug)
      if (res.status !== "resolved") {
        matchFailures.push(
          `match ${m.source.event_id}: ${side} team ${id} (${sourceTeam.name}) unresolved`
        )
      }
    }
  }

  const standingsRowFailures = []
  let standingsRowsTotal = 0
  let standingsRowsSkipped = 0
  for (const t of standings) {
    for (const r of t.standings_table) {
      standingsRowsTotal++
      if (SKIPPED_TABLES.has(t.source.table_id)) {
        standingsRowsSkipped++
        continue
      }
      const sourceTeam = sourceTeamById.get(r.source_team_id)
      if (!sourceTeam) {
        standingsRowFailures.push(
          `table ${t.source.table_id}: unknown source team id ${r.source_team_id}`
        )
        continue
      }
      const res = resolveTeam(
        sourceTeam,
        t.source.league_ids,
        teamIndex,
        leagueBySlug
      )
      if (res.status !== "resolved") {
        standingsRowFailures.push(
          `table ${t.source.table_id}: row ${r.source_team_id} (${sourceTeam.name}) unresolved`
        )
      }
    }
  }

  // --- accounting --------------------------------------------------------------
  const sourceTeamIds = new Set(sourceTeams.map((t) => t.source_team_id))
  const matchedTeamIds = new Set(
    matches.flatMap((m) => [m.source.team_ids.home, m.source.team_ids.away])
  )
  const standingsTeamIds = new Set(
    standings.flatMap((t) => t.standings_table.map((r) => r.source_team_id))
  )
  const matchedLeagueIds = new Set(matches.flatMap((m) => m.source.league_ids))
  const standingsLeagueIds = new Set(
    standings
      .filter((t) => !SKIPPED_TABLES.has(t.source.table_id))
      .flatMap((t) => t.source.league_ids)
  )
  const matchedSeasonIds = new Set(matches.flatMap((m) => m.source.season_ids))
  const standingsSeasonIds = new Set(
    standings
      .filter((t) => !SKIPPED_TABLES.has(t.source.table_id))
      .flatMap((t) => t.source.season_ids)
  )

  const allLeagueIds = new Set([...matchedLeagueIds, ...standingsLeagueIds])
  const allSeasonIds = new Set([...matchedSeasonIds, ...standingsSeasonIds])

  const resolvedTeams = Object.entries(teamMap).filter(
    ([, v]) => v.status !== "unmatched"
  )
  const unmatchedTeams = Object.entries(teamMap).filter(
    ([, v]) => v.status === "unmatched"
  )
  const duplicateTargets = [...targetUsage.entries()].filter(
    ([, ids]) => ids.length > 1
  )
  const unusedForgecmsTeams = forgecmsTeams.filter(
    (t) => !targetUsage.has(t.id)
  )

  // --- checks (report only written when every check passes) -------------------
  const errors = []
  if (matchFailures.length)
    errors.push(`match team failures: ${matchFailures.join("; ")}`)
  if (standingsRowFailures.length)
    errors.push(`standings row failures: ${standingsRowFailures.join("; ")}`)
  if (unknownLeagueIds.size)
    errors.push(
      `unknown source league ids: ${[...unknownLeagueIds].join(", ")}`
    )
  for (const ev of multiSeasonEvents) {
    if (!SEASON_OVERRIDES[ev])
      errors.push(`multi-season event without override: ${ev}`)
  }
  const unmatchedExpected = new Set([4094, 4520])
  const unmatchedActual = new Set(unmatchedTeams.map(([id]) => Number(id)))
  if (
    unmatchedActual.size !== unmatchedExpected.size ||
    [...unmatchedExpected].some((id) => !unmatchedActual.has(id))
  ) {
    errors.push(
      `unmatched set mismatch — expected {${[...unmatchedExpected].join(
        ", "
      )}}, got {${[...unmatchedActual].join(", ")}}`
    )
  }
  if (duplicateTargets.length) {
    errors.push(
      `duplicate ForgeCMS targets: ${duplicateTargets
        .map(([id, ids]) => `${id} <- ${ids.join(", ")}`)
        .join("; ")}`
    )
  }

  if (errors.length) {
    console.error("RECONCILIATION FAILED:")
    for (const e of errors) console.error("  -", e)
    process.exit(1)
  }

  // --- deterministic mapping file ----------------------------------------------
  const verification = {
    source_teams_total: sourceTeamIds.size,
    source_teams_resolved: resolvedTeams.length,
    source_teams_unmatched: unmatchedTeams.length,
    source_leagues_total: allLeagueIds.size,
    source_seasons_total: allSeasonIds.size,
    matches_total: matches.length,
    matches_team_failures: matchFailures.length,
    matches_multi_season_events: multiSeasonEvents,
    standings_tables_total: standings.length,
    standings_tables_skipped: [...SKIPPED_TABLES],
    standings_rows_total: standingsRowsTotal,
    standings_rows_skipped: standingsRowsSkipped,
    standings_row_failures: standingsRowFailures.length,
    forgecms_teams_total: forgecmsTeams.length,
    forgecms_teams_used: targetUsage.size,
    forgecms_teams_unused: unusedForgecmsTeams.map((t) => t.team_name),
    duplicate_forgecms_targets: duplicateTargets,
  }

  const reconciliation = {
    leagues: leagueMap,
    divisions: divisionMap,
    seasons: seasonMap,
    teams: teamMap,
    season_overrides: SEASON_OVERRIDES,
    verification,
  }

  await writeFile(
    join(DATA_DIR, "reconciliation.json"),
    JSON.stringify(reconciliation, null, 2) + "\n"
  )

  // --- unmatched report (docs/handoffs/competition-reconciliation.md) ----------
  const lgw = [8, 34, 30]
  const teamW = [10, 36, 36, 14]

  const lines = []
  lines.push(
    "# Competition reconciliation — SportsPress → ForgeCMS (import chunk 3 of 7)"
  )
  lines.push("")
  lines.push(
    "Part of [Task: Competition migration to ForgeCMS (matches + standings) from WordPress " +
      "SportsPress](https://github.com/Chapster87/pghrugby/issues/30) (chunk 3). Generated " +
      "deterministically by `scripts/competition-migration/reconcile.mjs` (`pnpm " +
      "competition:reconcile`) against the live ForgeCMS tables. Consumes chunk 2's " +
      "`scripts/competition-migration/data/` output and hands FKs to chunk 4."
  )
  lines.push("")
  lines.push("## Result")
  lines.push("")
  lines.push("| Check | Result |")
  lines.push("|---|---|")
  lines.push(
    `| distinct source teams | ${sourceTeamIds.size} — ${resolvedTeams.length} resolved, ${unmatchedTeams.length} unmatched |`
  )
  lines.push(
    `| distinct source leagues | ${allLeagueIds.size} → 3 ForgeCMS leagues (by gender) |`
  )
  lines.push(
    `| distinct source seasons | ${allSeasonIds.size} → ${forgecmsSeasons.length} ForgeCMS seasons (1:1; event 4816 by date) |`
  )
  lines.push(
    `| matches with home + away resolved | ${matches.length} / ${matches.length} |`
  )
  lines.push(
    `| standings rows resolved (real tables) | ${
      standingsRowsTotal - standingsRowsSkipped
    } / ${standingsRowsTotal - standingsRowsSkipped} |`
  )
  lines.push(
    `| standings rows in skipped generic table 3900 | ${standingsRowsSkipped} (chunk 4 skips it) |`
  )
  lines.push(
    `| ForgeCMS teams referenced | ${targetUsage.size} / ${
      forgecmsTeams.length
    } (unused: ${
      unusedForgecmsTeams.length === 0
        ? "none"
        : unusedForgecmsTeams.map((t) => `\`${t.team_name}\``).join(", ")
    }) |`
  )
  lines.push(`| duplicate ForgeCMS targets | ${duplicateTargets.length} |`)
  lines.push("")
  lines.push("## League map (14 → 3)")
  lines.push("")
  lines.push(
    row(["source id", "source league", "→ ForgeCMS league", "basis"], lgw)
  )
  lines.push(row(["---", "---", "---", "---"], lgw))
  for (const id of [...allLeagueIds].sort((a, b) => a - b)) {
    const l = leagueMap[id]
    lines.push(row([id, l.source_name, l.forgecms_name, l.reason], lgw))
  }
  lines.push("")
  lines.push(
    "The ForgeCMS `Non-League` league has no source counterpart and stays unused. The " +
      "8 Women's Friendly matches resolve to Midwest Women's Rugby by gender and to the " +
      "Friendly division (owner decision, issue 38)."
  )
  lines.push("")
  lines.push("## Division map (labels → 6 records)")
  lines.push("")
  lines.push("| label | → ForgeCMS division | status |")
  lines.push("|---|---|---|")
  for (const [label, d] of Object.entries(divisionMap)) {
    lines.push(
      `| ${label} | ${d.forgecms_id ? `\`${d.forgecms_name}\`` : "—"} | ${
        d.status
      } |`
    )
  }
  lines.push("")
  lines.push("## Season map (5 → 5)")
  lines.push("")
  lines.push("| source id | source season | → ForgeCMS season |")
  lines.push("|---|---|---|")
  for (const id of [...allSeasonIds].sort((a, b) => a - b)) {
    const s = seasonMap[id]
    lines.push(`| ${id} | ${s.source_name} | \`${s.forgecms_name}\` |`)
  }
  lines.push("")
  lines.push(
    "Event 4816 (Forge Women D1 vs Utah Vipers, Women's D1 Nationals) is dual-tagged " +
      "(2023 Fall + 2024 Spring) in the source; its date (2024-05-17) resolves it to " +
      "**2024 Spring**."
  )
  lines.push("")
  lines.push("## Team map (61)")
  lines.push("")
  lines.push(
    row(["source id", "source team", "→ ForgeCMS team", "status"], teamW)
  )
  lines.push(row(["---", "---", "---", "---"], teamW))
  for (const id of sourceTeamIds) {
    const t = teamMap[id]
    const target =
      t.status === "resolved"
        ? `${t.forgecms_name}`
        : t.status === "context"
        ? `${t.by_league_gender.men.forgecms_name} (men) / ${t.by_league_gender.women.forgecms_name} (women)`
        : "—"
    lines.push(row([id, t.source_name, target, t.status], teamW))
  }
  lines.push("")
  lines.push("## Unmatched teams")
  lines.push("")
  for (const [id, t] of unmatchedTeams) {
    lines.push(`- **${id} — ${t.source_name}**: ${t.reason}`)
  }
  lines.push("")
  lines.push(
    "All other source teams resolve to a unique ForgeCMS record (one source team, one " +
      "target — the injectivity check passes)."
  )
  lines.push("")
  lines.push("## Resolved decision")
  lines.push("")
  lines.push(
    "**The 8 Women's Friendly matches carry no source division**; per owner decision in " +
      "[Decide league + division assignment for the 8 Women's Friendly " +
      "matches](https://github.com/Chapster87/pghrugby/issues/38) they use the " +
      "**Friendly** division (created for this purpose; the earlier Mixed/Open record " +
      "was deleted — it had no references). Their league resolves to Midwest Women's " +
      "Rugby by gender."
  )
  lines.push("")
  lines.push("## Verification")
  lines.push("")
  lines.push(
    "- Every match has a home + away team resolved to a ForgeCMS record (127 / 127)."
  )
  lines.push(
    `- 100% of distinct source teams (${sourceTeamIds.size}) are accounted for: ` +
      `${resolvedTeams.length} resolved, ${unmatchedTeams.length} unmatched with reasons above.`
  )
  lines.push(
    `- 100% of distinct source leagues (${allLeagueIds.size}) and seasons (${allSeasonIds.size}) are mapped.`
  )
  lines.push(
    "- No existing ForgeCMS record is duplicated: every ForgeCMS team is the target of " +
      "at most one source team."
  )
  lines.push("")
  lines.push("## Handoff to chunk 4 (insert)")
  lines.push("")
  lines.push("Consume `data/reconciliation.json`; resolve FKs per record:")
  lines.push("")
  lines.push(
    "- **Teams**: `teams[source_team_id].forgecms_id`; for Akron RFC (4134, `status: context`) pick `teams[4134].by_league_gender[men|women]` from the record's league ids."
  )
  lines.push(
    "- **Leagues/divisions/seasons**: `leagues[id]`, `divisions[label]`, `seasons[id]`."
  )
  lines.push(
    "- **Event 4816**: use `season_overrides[4816]` (2024 Spring) instead of its dual season tag."
  )
  lines.push(
    "- **Table 3900** (`league-table`): skip — no league/season, junk stats, 61 rows."
  )
  lines.push(
    lines.push(
      lines.push(
        "- **Friendly matches**: league = Midwest Women's Rugby; division = Friendly (owner decision, issue 38)."
      )
    )
  )
  lines.push("")
  lines.push(
    `_Generated ${new Date().toISOString().slice(0, 10)} by reconcile.mjs._`
  )

  await writeFile(REPORT_PATH, lines.join("\n") + "\n")

  // --- stdout summary ----------------------------------------------------------
  console.log("=== RECONCILIATION ===")
  console.log(
    `teams: ${sourceTeamIds.size} source -> ${resolvedTeams.length} resolved, ${unmatchedTeams.length} unmatched`
  )
  console.log(
    `leagues: ${allLeagueIds.size} -> 3 | seasons: ${allSeasonIds.size} -> ${forgecmsSeasons.length} | matches: ${matches.length} | standings rows: ${standingsRowsTotal} (${standingsRowsSkipped} skipped)`
  )
  console.log(
    `forgecms teams used: ${targetUsage.size}/${forgecmsTeams.length} | duplicate targets: ${duplicateTargets.length} | match failures: ${matchFailures.length}`
  )
  console.log(`wrote ${join(DATA_DIR, "reconciliation.json")}`)
  console.log(`wrote ${REPORT_PATH}`)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
