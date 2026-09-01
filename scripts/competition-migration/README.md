# Competition migration — extract + normalize (import chunk 2 of 7)

Extracts the full SportsPress competition history from WordPress into a
**normalized intermediate shape**, ready for reconciliation (chunk 3) and
insertion into ForgeCMS (chunk 4) — part of
[Task: Competition migration to ForgeCMS (matches + standings) from WordPress SportsPress](https://github.com/Chapster87/pghrugby/issues/30).

The access method was locked in by the chunk-1 research ticket
([#31](https://github.com/Chapster87/pghrugby/issues/31)): the **public
`sportspress/v2` REST namespace**, unauthenticated — see
[`docs/agents/sportspress-access.md`](../../docs/agents/sportspress-access.md).
No env vars are needed.

## Run

```bash
node scripts/competition-migration/extract.mjs
# or: pnpm competition:extract
```

Fetches all `events` (127), `tables` (19), `teams` (61), and the
`leagues`/`seasons`/`venues` term maps, normalizes, prints a verification
summary, and rewrites `data/`. **Hard-fails if the fetched row count ever
disagrees with the source `X-WP-Total`**, so drift is caught, not absorbed.
Output is deterministic (stable ordering) — rerunning regenerates identical
files.

## Outputs (`scripts/competition-migration/data/`)

### `matches.json` — one record per `sp_event`

```jsonc
{
  "match_date_time": "2025-11-08T17:00:41.000Z",   // UTC (from date_gmt)
  "league": "Midwest Women's D1 Playoffs",           // source league name(s)
  "division": "D1",                                  // derived, see below
  "season": "2025 Fall",                             // source season name(s)
  "match_type": "competitive",                       // derived, see below
  "home_team": "Pittsburgh Forge D1 Women",          // source team name
  "away_team": "Metropolis Valkyries",               // source team name
  "event_name": "Forge Women D1 vs Metropolis Valkyries",
  "slug": "forge-women-d1-vs-metropolis-valkyries-2",
  "home_team_score": 22,                             // null when unplayed
  "away_team_score": 20,
  "source": { /* raw keys — see below */ }
}
```

`source` carries the raw WordPress keys for reconciliation: `event_id`,
`link`, `status`, `minutes`, `date` (site-local), `date_gmt`, `team_ids`
(`{ home, away }`), `league_ids`, `season_ids`, `venue_ids`, `winner`,
`outcome`.

### `standings.json` — one record per `sp_table`

```jsonc
{
  "season": "2025 Fall",
  "league": "Midwest Women's D2",
  "division": "D2",
  "slug": "midwest-womens-d2-fall-2025",
  "standings_table": [
    {
      "source_team_id": 4973,
      "name": "Forge Women D2",     // inline source name (may differ from teams.json)
      "pos": 2, "gp": 4, "w": 2, "l": 2, "d": 0,
      "pf": 186, "pa": 129, "pd": 57,
      "bt": 4, "bl": 0, "ff": 0, "pts": 12, "lppg": 3
    }
  ],
  "source": { "table_id": 5388, "link": "...", "status": "publish", "date": "...",
              "league_ids": [567], "season_ids": [574] }
}
```

Source rows are preserved **whole** so chunk 4 can reshape them into the
ForgeCMS `standings_table` JSON. Note the source tie column is `d`
(SportsPress header labels it "T"); the ForgeCMS shape uses `t` — chunk 4
renames it. Stat values are coerced to numbers (`"-"`/blank → `null`).

### `teams.json` / `terms.json` — companion maps for chunk 3

`teams.json`: every source team (`source_team_id`, `name`, `slug`,
`abbreviation`, `league_ids`, `season_ids`) — 61 rows. `terms.json`: the
`leagues` (14), `seasons` (5), `venues` (3) term maps (id, name, slug).

## Derivation rules (the decisions this chunk makes)

- **Home/away**: SportsPress lists the home side first in `teams`; the
  normalized record keeps that order (`team_ids.home` = `teams[0]`). The
  venue is the authoritative signal — chunk 4 can flip if a match was played
  at a neutral venue.
- **`match_date_time`**: UTC ISO-8601 from `date_gmt` (site-local `date` is
  kept in `source` for human review).
- **`division`**: SportsPress has **no division taxonomy** — ForgeCMS does.
  The division is encoded in the league term name, so it is *derived* from the
  event/table's league via a fixed map (see `LEAGUE_DIVISION` in the script):
  `D1` (Premiership, D1 Playoffs, Nationals), `D2`, `D3`, `D4`,
  `Div 1 & 2 Hybrid`. The `Women's Friendly` league encodes no division →
  `null`. Chunk 3 maps these labels onto the 6 ForgeCMS division records.
- **`match_type`**: derived from the league — `friendly` for the
  `Women's Friendly` league, `competitive` everywhere else (playoffs included;
  this matches the ForgeCMS select vocabulary — the existing row uses
  `"competitive"`).
- **Names**: all names come from `title.rendered` (posts) or `name` (terms),
  HTML-unescaped (WP entities like `&#8211;` → `–`).

## Known edge cases (all preserved, flagged for later chunks)

- **8 unscored matches** — `home_team_score`/`away_team_score` are `null`:
  the 7 unrecorded 2022 Forge D2 Men fixtures (events 4140–4147) and the
  2025-11-15 Forge Women D1 vs Chicago North Shore playoff (event 5651,
  no result recorded).
- **Event 4816** (Forge Women D1 vs Utah Vipers, Women's D1 Nationals) is
  tagged with **two seasons** (2023 Fall + 2024 Spring) — `season` joins both
  names; chunk 3 must pick the single ForgeCMS season FK.
- **Table 3900 "League Table"** (`league-table`) is SportsPress's catch-all —
  no league/season, 61 rows, junk stats. Kept with `null` context; **chunk 4
  should skip it**.
- **66 of 127 matches have no venue** (`venue_ids: []`).
- **Name drift**: standings inline names are editorial ("Forge Women D2",
  "Forge Men D1") and differ from the team records in `teams.json`
  ("Pittsburgh Forge D2 Women"). Reconciliation should key on
  `source_team_id` first, names second.
- Table `date` is the post-creation date (mostly 2022–2023), **not** the
  season date — ignore it.

## Verification (2026-08-31 run)

| Check | Result |
|---|---|
| events fetched vs `X-WP-Total` | 127 / 127 |
| tables fetched vs `X-WP-Total` | 19 / 19 |
| matches scored / unscored | 119 / 8 |
| distinct teams / leagues / seasons in matches | 54 / 14 / 5 |
| matches missing venue | 66 |
| matches with derived division | 119 (8 friendly → null) |
| standings with league+season / generic | 18 / 1 |
| standings rows (total) | 165 |
| sample spot-checks | event 5642 (Forge 22–20, 2025-11-08T17:00:41Z), table 5388 row (Forge Women D2, pos 2, pts 12), entity unescaping (`–`, `’`) ✓ |
| rerun | deterministic (identical output) |

## Handoff

- **Chunk 3 (reconcile)** consumes `matches.json` + `standings.json` +
  `teams.json` + `terms.json`: map source names/IDs → existing ForgeCMS
  `teams` (60), `leagues` (3), `seasons` (5), `divisions` (6) records; surface
  unmatched teams (7 source teams never appear in a match: Harrisburg ×3,
  Kent State, etc.). Division labels to map: `D1` → `Premiership (Div 1)`,
  `D2` → `Division 2`, `D3` → `Division 3`, `D4` → `Division 4`,
  `Div 1 & 2 Hybrid` → `Division 1 & 2 Hybrid`.
- **Chunk 4 (insert)** reshapes `standings_table` rows into the ForgeCMS
  shape (`d` → `t`, add `team_id`/`team_name` refs, optional `team_logo`),
  skips table 3900, and inserts `matches` (FKs from chunk 3, `match_type`
  finalized against the select field, `slug` de-duplicated if needed).
