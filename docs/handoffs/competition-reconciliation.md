# Competition reconciliation — SportsPress → ForgeCMS (import chunk 3 of 7)

Part of [Task: Competition migration to ForgeCMS (matches + standings) from WordPress SportsPress](https://github.com/Chapster87/pghrugby/issues/30) (chunk 3). Generated deterministically by `scripts/competition-migration/reconcile.mjs` (`pnpm competition:reconcile`) against the live ForgeCMS tables. Consumes chunk 2's `scripts/competition-migration/data/` output and hands FKs to chunk 4.

## Result

| Check | Result |
|---|---|
| distinct source teams | 61 — 59 resolved, 2 unmatched |
| distinct source leagues | 14 → 3 ForgeCMS leagues (by gender) |
| distinct source seasons | 5 → 5 ForgeCMS seasons (1:1; event 4816 by date) |
| matches with home + away resolved | 127 / 127 |
| standings rows resolved (real tables) | 104 / 104 |
| standings rows in skipped generic table 3900 | 61 (chunk 4 skips it) |
| ForgeCMS teams referenced | 60 / 60 (unused: none) |
| duplicate ForgeCMS targets | 0 |

## League map (14 → 3)

| source id | source league                      | → ForgeCMS league              | basis |
| ---      | ---                                | ---                            | --- |
| 514      | Midwest Premiership - D1 Men       | Midwest Men's Rugby            | men's competition (Midwest Premiership - D1 Men) |
| 518      | Midwest Men's D2                   | Midwest Men's Rugby            | men's competition (Midwest Men's D2) |
| 519      | Midwest Women's D1 & D2 Hybrid     | Midwest Women's Rugby          | women's competition (Midwest Women's D1 & D2 Hybrid) |
| 520      | Midwest Men's D3                   | Midwest Men's Rugby            | men's competition (Midwest Men's D3) |
| 522      | Women's Friendly                   | Midwest Women's Rugby          | women's competition (Women's Friendly) |
| 523      | Midwest Women's D1 Playoffs        | Midwest Women's Rugby          | women's competition (Midwest Women's D1 Playoffs) |
| 539      | Midwest Premiership - D1 Women     | Midwest Women's Rugby          | women's competition (Midwest Premiership - D1 Women) |
| 541      | Midwest Men's D4                   | Midwest Men's Rugby            | men's competition (Midwest Men's D4) |
| 543      | Midwest Men's D4 Playoffs          | Midwest Men's Rugby            | men's competition (Midwest Men's D4 Playoffs) |
| 567      | Midwest Women's D2                 | Midwest Women's Rugby          | women's competition (Midwest Women's D2) |
| 569      | Midwest Men's D1 Playoffs          | Midwest Men's Rugby            | men's competition (Midwest Men's D1 Playoffs) |
| 575      | Midwest Men's D3 Playoffs          | Midwest Men's Rugby            | men's competition (Midwest Men's D3 Playoffs) |
| 576      | Midwest Women's D2 Playoffs        | Midwest Women's Rugby          | women's competition (Midwest Women's D2 Playoffs) |
| 577      | Women's D1 Nationals               | Midwest Women's Rugby          | women's competition (Women's D1 Nationals) |

The ForgeCMS `Non-League` league has no source counterpart and stays unused. The 8 Women's Friendly matches resolve to Midwest Women's Rugby by gender and to the Friendly division (owner decision, issue 38).

## Division map (labels → 6 records)

| label | → ForgeCMS division | status |
|---|---|---|
| D1 | `Premiership (Div 1)` | resolved |
| D2 | `Division 2` | resolved |
| D3 | `Division 3` | resolved |
| D4 | `Division 4` | resolved |
| Div 1 & 2 Hybrid | `Division 1 & 2 Hybrid` | resolved |
| (friendly) | `Friendly` | resolved |

## Season map (5 → 5)

| source id | source season | → ForgeCMS season |
|---|---|---|
| 515 | 2022 Fall | `2022 Fall` |
| 538 | 2023 Fall | `2023 Fall` |
| 557 | 2024 Spring | `2024 Spring` |
| 568 | 2024 Fall | `2024 Fall` |
| 574 | 2025 Fall | `2025 Fall` |

Event 4816 (Forge Women D1 vs Utah Vipers, Women's D1 Nationals) is dual-tagged (2023 Fall + 2024 Spring) in the source; its date (2024-05-17) resolves it to **2024 Spring**.

## Team map (61)

| source id  | source team                          | → ForgeCMS team                      | status         |
| ---        | ---                                  | ---                                  | ---            |
| 4134       | Akron RFC                            | Akron RFC (men) / Akron RFC (women)  | context        |
| 3914       | Buffalo Women’s Rugby Club           | Buffalo Women's Rugby Club           | resolved       |
| 4576       | Canton Rugby                         | Canton Rugby                         | resolved       |
| 3921       | Chicago Griffins                     | Chicago Griffins                     | resolved       |
| 4015       | Chicago Lions Men D1                 | Chicago Lions                        | resolved       |
| 4112       | Chicago Lions Women D1               | Chicago Lions                        | resolved       |
| 5649       | Chicago North Shore                  | Chicago North Shore                  | resolved       |
| 5645       | Cincinnati Kelts                     | Cincinnati Kelts                     | resolved       |
| 3959       | Cincinnati Kelts Women’s Rugby       | Cincinnati Kelts Women's Rugby       | resolved       |
| 4024       | Cincinnati Wolfhounds                | Cincinnati Wolfhounds                | resolved       |
| 4017       | Cleveland Crusaders D1               | Cleveland Crusaders                  | resolved       |
| 4025       | Cleveland Crusaders D3               | Cleveland Crusaders                  | resolved       |
| 4101       | Cleveland Iron Maidens               | Cleveland Iron Maidens               | resolved       |
| 4137       | Cleveland Rovers RFC D3              | Cleveland Rovers RFC D3              | resolved       |
| 4527       | Cleveland Rovers RFC D4              | Cleveland Rovers RFC D4              | resolved       |
| 4522       | Columbus (IN) RFC                    | Columbus (IN) RFC                    | resolved       |
| 4528       | Columbus Castaways D4                | Columbus Castaways D4                | resolved       |
| 5647       | Columbus Coyotes                     | Columbus Coyotes                     | resolved       |
| 4133       | Columbus Rugby Club                  | Columbus Rugby Club                  | resolved       |
| 3957       | Columbus Women’s Rugby               | Columbus Women's Rugby               | resolved       |
| 5635       | Dayton Area Rugby Club               | Dayton Area Rugby Club               | resolved       |
| 4526       | Dayton Area Rugby Club               | Dayton Area Rugby Club               | resolved       |
| 4521       | Detroit Rugby Football Club – Men D4 | Detroit Rugby Football Club - Men    | resolved       |
| 3963       | Detroit Rugby Football Club – Womens | Detroit Rugby Football Club - Womens | resolved       |
| 4027       | Detroit Tradesmen D1                 | Detroit Tradesmen                    | resolved       |
| 4520       | Detroit Tradesmen D3                 | —                                    | unmatched      |
| 5443       | Erie RFC                             | Erie RFC                             | resolved       |
| 4581       | Findlay RFC                          | Findlay RFC                          | resolved       |
| 5430       | Grand Rapids Growlers                | Grand Rapids Growlers                | resolved       |
| 4139       | Greensburg RFC                       | Greensburg RFC                       | resolved       |
| 4094       | Harrisburg Rugby Club                | —                                    | unmatched      |
| 4097       | Harrisburg Rugby Club Men            | Harrisburg Rugby Club Men            | resolved       |
| 4098       | Harrisburg Rugby Club Women          | Harrisburg Rugby Club Women          | resolved       |
| 5442       | Indianapolis Impalas D1              | Indianapolis Impalas D1              | resolved       |
| 3907       | Indianapolis Impalas D2              | Indianapolis Impalas D2              | resolved       |
| 5105       | Indianapolis Impalas D4              | Indianapolis Impalas D4              | resolved       |
| 4106       | Kent State Women’s Rugby Club        | Kent State Women's Rugby Club        | resolved       |
| 4517       | Marysville RFC                       | Marysville RFC                       | resolved       |
| 5112       | Metropolis Valkyries                 | Metropolis Valkyries                 | resolved       |
| 5013       | North Buffalo Ninjas                 | North Buffalo Ninjas                 | resolved       |
| 3894       | Pittsburgh Forge D1 Men              | Pittsburgh Forge                     | resolved       |
| 3913       | Pittsburgh Forge D1 Women            | Pittsburgh Forge                     | resolved       |
| 3909       | Pittsburgh Forge D2 Men              | Pittsburgh Forge D2 Men              | resolved       |
| 4973       | Pittsburgh Forge D2 Women            | Pittsburgh Forge D2 Women            | resolved       |
| 3912       | Pittsburgh Forge D3 Men              | Pittsburgh Forge D3 Men              | resolved       |
| 4510       | Pittsburgh Forge D4 Men              | Pittsburgh Forge D4 Men              | resolved       |
| 3918       | Pittsburgh Forge Women – Gold        | Pittsburgh Forge Women - Gold        | resolved       |
| 5445       | Pittsburgh Harlequins                | Pittsburgh Harlequins                | resolved       |
| 4135       | Presque Isle RFC                     | Presque Isle RFC                     | resolved       |
| 4132       | Queen City Rugby Club                | Queen City Rugby Club                | resolved       |
| 4990       | Rochester Renegades                  | Rochester Renegades                  | resolved       |
| 5018       | South Buffalo Rugby                  | South Buffalo Rugby                  | resolved       |
| 4136       | South Pittsburgh Hooligans RFC D3    | South Pittsburgh Hooligans RFC       | resolved       |
| 5636       | South Pittsburgh Hooligans RFC D4    | South Pittsburgh Hooligans RFC D4    | resolved       |
| 5107       | St. Louis Bombers                    | St. Louis Bombers                    | resolved       |
| 4815       | TBD                                  | TBD                                  | resolved       |
| 4674       | University of Cincinnati WRFC        | University of Cincinnati WRFC        | resolved       |
| 4828       | Utah Vipers                          | Utah Vipers                          | resolved       |
| 5016       | Uticuse Rugby Club                   | Uticuse Rugby Club                   | resolved       |
| 4669       | Westside Outcasts                    | Westside Outcasts                    | resolved       |
| 5020       | Ypsilanti Rugby Club                 | Ypsilanti Rugby Club                 | resolved       |

## Unmatched teams

- **4094 — Harrisburg Rugby Club**: Legacy duplicate — the source carries two records for the same men's club (4094 "Harrisburg Rugby Club" and 4097 "Harrisburg Rugby Club Men"); 4097 matches the ForgeCMS record exactly, 4094 is the generic predecessor. Gender-ambiguous and present only in the skipped generic table 3900, so no real row needs it — never duplicate the ForgeCMS Harrisburg Men record.
- **4520 — Detroit Tradesmen D3**: No ForgeCMS record — ForgeCMS has Detroit Tradesmen (D1) only; the source D3 squad has no D3 counterpart. Present only in the skipped generic table 3900, so no real row needs it.

All other source teams resolve to a unique ForgeCMS record (one source team, one target — the injectivity check passes).

## Resolved decision

**The 8 Women's Friendly matches carry no source division**; per owner decision in [Decide league + division assignment for the 8 Women's Friendly matches](https://github.com/Chapster87/pghrugby/issues/38) they use the **Friendly** division (created for this purpose; the earlier Mixed/Open record was deleted — it had no references). Their league resolves to Midwest Women's Rugby by gender.

## Verification

- Every match has a home + away team resolved to a ForgeCMS record (127 / 127).
- 100% of distinct source teams (61) are accounted for: 59 resolved, 2 unmatched with reasons above.
- 100% of distinct source leagues (14) and seasons (5) are mapped.
- No existing ForgeCMS record is duplicated: every ForgeCMS team is the target of at most one source team.

## Handoff to chunk 4 (insert)

Consume `data/reconciliation.json`; resolve FKs per record:

- **Teams**: `teams[source_team_id].forgecms_id`; for Akron RFC (4134, `status: context`) pick `teams[4134].by_league_gender[men|women]` from the record's league ids.
- **Leagues/divisions/seasons**: `leagues[id]`, `divisions[label]`, `seasons[id]`.
- **Event 4816**: use `season_overrides[4816]` (2024 Spring) instead of its dual season tag.
- **Table 3900** (`league-table`): skip — no league/season, junk stats, 61 rows.
- **Friendly matches**: league = Midwest Women's Rugby; division = Friendly (owner decision, issue 38).
154
155

_Generated 2026-09-01 by reconcile.mjs._
