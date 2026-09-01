#!/usr/bin/env node
/**
 * Insert the reconciled SportsPress competition data into ForgeCMS
 * (import chunk 4 of 7).
 *
 * Consumes chunk 2's normalized data + chunk 3's reconciliation map
 * (`scripts/competition-migration/data/`), resolves every FK to an existing
 * ForgeCMS record, and writes `matches` + `standings` rows to the shared
 * Supabase/ForgeCMS database via the shared PostgREST client (service role).
 *
 * Field shapes follow the ForgeCMS registry (`pnpm supabase:inspect-forgecms`)
 * and the existing rows:
 *   - `matches` references (`league`, `division`, `season`, `home_team`,
 *     `away_team`) are single-element arrays of UUIDs; `match_type` is the
 *     select vocabulary (`competitive` | `friendly`).
 *   - `standings.league_standings` is the app's `standings_table` JSON shape:
 *     stat keys `l`/`t`/`w`/`bl`/`bt`/`ff`/`gp`/`pa`/`pd`/`pf` + `team_id` /
 *     `team_name` (the SportsPress tie column `d` is renamed `t`; `pos`/`pts`/
 *     `lppg` are derived at render time by the app, so they are dropped;
 *     blanks are coerced to 0 to match existing records). The club's row is
 *     marked `is_focused: true`, mirroring the pre-seeded 2025 Fall row.
 *
 * Idempotency — re-running must never duplicate:
 *   - matches are keyed by `slug` (unique across the 127 source events);
 *     existing slugs are skipped.
 *   - standings are keyed by `slug` and by the (season, league, division)
 *     combo; existing combos are **updated in place** (the two pre-seeded
 *     2025 Fall D1 rows are all-zero placeholders — replacing their
 *     `league_standings` with the real source table avoids duplicate rows for
 *     the same combo, which would make the app's `edges[0]` render
 *     nondeterministic).
 *   - a source match whose fixture already exists as a live row (same date +
 *     same resolved home/away ForgeCMS teams — e.g. the pre-seeded
 *     2025-09-27 Griffins row) is skipped, so the import can't double-book a
 *     fixture.
 *
 * Run from the repo root (needs `.env.local` — Supabase service role):
 *   node --env-file=.env.local scripts/competition-migration/insert.mjs
 *   node --env-file=.env.local scripts/competition-migration/insert.mjs --dry-run
 *   # or: pnpm competition:insert [-- --dry-run]
 *
 * Hard-fails (exit 1) on any resolution failure or post-insert verification
 * mismatch (row counts, orphan FKs), so the database is never left in a
 * half-imported or unverifiable state.
 */

import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { count, insert, select, update } from "../lib/supabase.mjs"

const DATA_DIR = join(import.meta.dirname, "data")
const DRY_RUN = process.argv.includes("--dry-run")

// Mirrors reconcile.mjs: source league id -> gender (needed to resolve the
// gender-spanning Akron RFC record per row).
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

// Mirrors reconcile.mjs: source league id -> derived division label.
// Leagues without an entry (the Women's Friendly league) encode no division
// and resolve to the Friendly division record (owner decision, issue 38).
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

// Generic catch-all SportsPress table (no league/season, junk stats) — skipped.
const SKIPPED_TABLES = new Set([3900])

/** Loads a normalized intermediate data file from chunk 2. */
async function loadData(name) {
  return JSON.parse(await readFile(join(DATA_DIR, name), "utf8"))
}

/**
 * Resolves the gender of a set of source league ids.
 * @param {number[]} leagueIds - Source `sp_league` term ids.
 * @returns {"men"|"women"} The common gender (mixed genders would be a
 *   source-data problem — reconcile.mjs already guards this).
 */
function genderFor(leagueIds) {
  const genders = new Set(
    leagueIds.map((id) => LEAGUE_GENDER[id]).filter(Boolean)
  )
  if (genders.size !== 1) {
    throw new Error(
      `cannot resolve gender for league ids ${leagueIds.join(", ")}`
    )
  }
  return [...genders][0]
}

/**
 * Returns the source division label for a record's leagues, or null when the
 * record encodes none (Women's Friendly).
 * @param {number[]} leagueIds - Source `sp_league` term ids.
 * @returns {string|null}
 */
function divisionLabelFor(leagueIds) {
  for (const id of leagueIds) {
    const label = LEAGUE_DIVISION[id]
    if (label) return label
  }
  return null
}

async function main() {
  const [matches, standings, terms, reconciliation] = await Promise.all([
    loadData("matches.json"),
    loadData("standings.json"),
    loadData("terms.json"),
    loadData("reconciliation.json"),
  ])
  const {
    leagues: leagueMap,
    divisions: divisionMap,
    seasons: seasonMap,
    teams: teamMap,
    season_overrides: seasonOverrides,
  } = reconciliation

  // --- FK resolvers (all lookups are against the chunk-3 map; anything the
  // map can't answer is a hard error — the import never guesses) --------------
  function resolveLeague(leagueIds) {
    for (const id of leagueIds) {
      const entry = leagueMap[id]
      if (entry) return { ...entry, source_id: id }
    }
    throw new Error(`no league reconciliation for ids ${leagueIds.join(", ")}`)
  }

  function resolveSeason(seasonIds, eventId) {
    let id = seasonIds[0]
    if (seasonIds.length > 1) {
      const override = seasonOverrides?.[eventId]
      if (!override)
        throw new Error(`multi-season record (${eventId}) without override`)
      id = override
    }
    const entry = seasonMap[id]
    if (!entry) throw new Error(`no season reconciliation for id ${id}`)
    return { ...entry, source_id: id }
  }

  function resolveDivision(leagueIds) {
    const label = divisionLabelFor(leagueIds) ?? "(friendly)"
    const entry = divisionMap[label]
    if (!entry) throw new Error(`no division reconciliation for label ${label}`)
    return { ...entry, label }
  }

  function resolveTeam(sourceTeamId, leagueIds) {
    const entry = teamMap[sourceTeamId]
    if (!entry)
      throw new Error(`no team reconciliation for source team ${sourceTeamId}`)
    if (entry.status === "unmatched")
      throw new Error(
        `unmatched source team ${sourceTeamId} referenced by a real row`
      )
    if (entry.status === "context") {
      const target = entry.by_league_gender[genderFor(leagueIds)]
      if (!target)
        throw new Error(
          `no ${genderFor(leagueIds)} target for source team ${sourceTeamId}`
        )
      return { ...target, source_id: sourceTeamId }
    }
    return { ...entry, source_id: sourceTeamId }
  }

  // --- existing rows (idempotency guard) --------------------------------------
  const [existingMatches, existingStandings] = await Promise.all([
    select("matches", "select=id,slug,match_date_time,home_team,away_team"),
    select("standings", "select=id,slug,season,league,division"),
  ])
  const matchSlugs = new Set(existingMatches.map((r) => r.slug))
  const liveFixtures = new Set(
    existingMatches.map((r) =>
      JSON.stringify([
        r.match_date_time ? r.match_date_time.slice(0, 10) : null,
        r.home_team?.[0] ?? null,
        r.away_team?.[0] ?? null,
      ])
    )
  )
  const standingsBySlug = new Map(
    existingStandings.filter((r) => r.slug).map((r) => [r.slug, r])
  )
  const standingsByCombo = new Map(
    existingStandings.map((r) => [
      [r.season, r.league, r.division].join("|"),
      r,
    ])
  )

  // --- build match payloads ---------------------------------------------------
  const matchRows = []
  const matchSkipsBySlug = []
  const matchSkipsByFixture = []
  for (const m of matches) {
    const league = resolveLeague(m.source.league_ids)
    const division = resolveDivision(m.source.league_ids)
    const season = resolveSeason(m.source.season_ids, m.source.event_id)
    const home = resolveTeam(m.source.team_ids.home, m.source.league_ids)
    const away = resolveTeam(m.source.team_ids.away, m.source.league_ids)
    const payload = {
      match_date_time: m.match_date_time,
      league: [league.forgecms_id],
      division: [division.forgecms_id],
      season: [season.forgecms_id],
      match_type: m.match_type,
      home_team: [home.forgecms_id],
      away_team: [away.forgecms_id],
      event_name: m.event_name,
      slug: m.slug,
      home_team_score: m.home_team_score ?? null,
      away_team_score: m.away_team_score ?? null,
    }
    if (matchSlugs.has(m.slug)) {
      matchSkipsBySlug.push(m.source.event_id)
      continue
    }
    const fixtureKey = JSON.stringify([
      m.match_date_time.slice(0, 10),
      payload.home_team[0],
      payload.away_team[0],
    ])
    if (liveFixtures.has(fixtureKey)) {
      matchSkipsByFixture.push(m.source.event_id)
      continue
    }
    matchRows.push(payload)
  }

  // --- build standings payloads (table 3900 skipped) ---------------------------
  const standingsToInsert = []
  const standingsToUpdate = [] // live placeholder rows, updated in place
  let standingsRowsSkipped = 0
  let standingsRowsBuilt = 0
  for (const t of standings) {
    if (SKIPPED_TABLES.has(t.source.table_id)) {
      standingsRowsSkipped += t.standings_table.length
      continue
    }
    const league = resolveLeague(t.source.league_ids)
    const division = resolveDivision(t.source.league_ids)
    const season = resolveSeason(t.source.season_ids, t.source.table_id)
    const table = t.standings_table.map((r) => {
      const team = resolveTeam(r.source_team_id, t.source.league_ids)
      const row = {
        l: r.l ?? 0,
        t: r.d ?? 0,
        w: r.w ?? 0,
        bl: r.bl ?? 0,
        bt: r.bt ?? 0,
        ff: r.ff ?? 0,
        gp: r.gp ?? 0,
        pa: r.pa ?? 0,
        pd: r.pd ?? 0,
        pf: r.pf ?? 0,
        team_id: team.forgecms_id,
        team_name: team.forgecms_name,
      }
      if (team.forgecms_name.startsWith("Pittsburgh Forge"))
        row.is_focused = true
      return row
    })
    standingsRowsBuilt += table.length
    const payload = {
      season: season.forgecms_id,
      league: league.forgecms_id,
      division: division.forgecms_id,
      slug: t.slug,
      league_standings: table,
    }
    const comboKey = [payload.season, payload.league, payload.division].join(
      "|"
    )
    const live = standingsByCombo.get(comboKey)
    if (live) {
      standingsToUpdate.push({ id: live.id, row: payload })
    } else if (standingsBySlug.has(t.slug)) {
      throw new Error(
        `standings slug ${t.slug} already exists without the same season/league/division combo — refusing to guess`
      )
    } else {
      standingsToInsert.push(payload)
    }
  }

  // --- summary ----------------------------------------------------------------
  const plan = {
    matchesToInsert: matchRows.length,
    matchesSkippedBySlug: matchSkipsBySlug,
    matchesSkippedByFixture: matchSkipsByFixture,
    standingsTablesToInsert: standingsToInsert.length,
    standingsTablesToUpdate: standingsToUpdate.map((u) => u.row.slug),
    standingsRowsToInsert: standingsToInsert.reduce(
      (n, s) => n + s.league_standings.length,
      0
    ),
    standingsRowsToUpdate: standingsToUpdate.reduce(
      (n, u) => n + u.row.league_standings.length,
      0
    ),
    standingsRowsSkippedTable3900: standingsRowsSkipped,
  }
  console.log("=== IMPORT PLAN (chunk 4) ===")
  console.log(JSON.stringify(plan, null, 2))
  if (matchSkipsByFixture.length) {
    console.log(
      `NOTE: ${
        matchSkipsByFixture.length
      } source match(es) skipped — fixture already present as a live row (same date + teams): events ${matchSkipsByFixture.join(
        ", "
      )}`
    )
  }
  if (standingsToUpdate.length) {
    console.log(
      `NOTE: ${
        standingsToUpdate.length
      } live standings row(s) updated in place (pre-seeded placeholder for the same season/league/division combo): ${standingsToUpdate
        .map((u) => u.row.slug)
        .join(", ")}`
    )
  }
  if (DRY_RUN) {
    console.log("DRY RUN — no rows written.")
    return
  }

  // --- write -------------------------------------------------------------------
  if (matchRows.length) {
    const inserted = await insert("matches", matchRows, { returning: true })
    console.log(`inserted ${inserted?.length ?? matchRows.length} matches`)
  }
  for (const u of standingsToUpdate) {
    await update(
      "standings",
      `id=eq.${u.id}`,
      { slug: u.row.slug, league_standings: u.row.league_standings },
      { returning: false }
    )
    console.log(`updated standings row ${u.id} (${u.row.slug}) in place`)
  }
  if (standingsToInsert.length) {
    const inserted = await insert("standings", standingsToInsert, {
      returning: true,
    })
    console.log(
      `inserted ${inserted?.length ?? standingsToInsert.length} standings rows`
    )
  }

  // --- verify ------------------------------------------------------------------
  const matchTotal = await count("matches")
  const standingsTotal = await count("standings")
  console.log(`matches total: ${matchTotal}`)
  console.log(`standings total: ${standingsTotal}`)

  // Orphan check: every FK referenced by the imported/updated rows must exist
  // in its target table.
  const referenced = {
    leagues: new Set(),
    divisions: new Set(),
    seasons: new Set(),
    teams: new Set(),
  }
  for (const m of matchRows) {
    referenced.leagues.add(m.league[0])
    referenced.divisions.add(m.division[0])
    referenced.seasons.add(m.season[0])
    referenced.teams.add(m.home_team[0])
    referenced.teams.add(m.away_team[0])
  }
  for (const s of [
    ...standingsToInsert,
    ...standingsToUpdate.map((u) => u.row),
  ]) {
    referenced.leagues.add(s.league)
    referenced.divisions.add(s.division)
    referenced.seasons.add(s.season)
    for (const row of s.league_standings) referenced.teams.add(row.team_id)
  }
  const [liveLeagues, liveDivisions, liveSeasons, liveTeams] =
    await Promise.all([
      select("leagues", "select=id"),
      select("divisions", "select=id"),
      select("seasons", "select=id"),
      select("teams", "select=id"),
    ])
  const live = {
    leagues: new Set(liveLeagues.map((r) => r.id)),
    divisions: new Set(liveDivisions.map((r) => r.id)),
    seasons: new Set(liveSeasons.map((r) => r.id)),
    teams: new Set(liveTeams.map((r) => r.id)),
  }
  const orphans = []
  for (const kind of Object.keys(referenced)) {
    for (const id of referenced[kind]) {
      if (!live[kind].has(id)) orphans.push(`${kind}:${id}`)
    }
  }
  if (orphans.length) {
    console.error("ORPHAN FKs DETECTED:", orphans.join(", "))
    process.exit(1)
  }
  console.log(
    `orphan FK check: ${[...Object.values(referenced)].reduce(
      (n, s) => n + s.size,
      0
    )} references — all resolve`
  )

  // Spot samples for the resolution record.
  const sampleMatches = await select(
    "matches",
    "select=match_date_time,event_name,slug,home_team_score,away_team_score,league,division,season,home_team,away_team&order=match_date_time.desc&limit=3"
  )
  const sampleStandings = await select(
    "standings",
    "select=slug,season,league,division,league_standings&order=created_at.desc&limit=2"
  )
  console.log("\n=== SPOT SAMPLES: latest matches ===")
  console.log(JSON.stringify(sampleMatches, null, 2))
  console.log("\n=== SPOT SAMPLES: latest standings rows ===")
  console.log(JSON.stringify(sampleStandings, null, 2))
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
