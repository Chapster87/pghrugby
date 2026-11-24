# WordPress URL Inventory

Inventory of every URL the live WordPress site at <https://pghrugby.com> serves, captured
for the WordPress → Next.js migration (issue #176).

- **Captured:** 2026-11-23
- **Site:** `https://pghrugby.com` (WordPress + WooCommerce + SportsPress)
- **Method:** sitemap index + sub-sitemaps, WooCommerce REST (`wc/v3`, authenticated with
  app password), and SportsPress REST (`sportspress/v2`, unauthenticated). Every URL below
  was confirmed to resolve (HTTP 200) unless noted.

## Summary

| Type | Count | URL shape | In sitemap? |
| --- | ---: | --- | :---: |
| Home | 1 | `/` | yes |
| HTML sitemap | 1 | `/sitemap.html` | yes |
| Pages | 33 | `/:slug/`, `/player/:slug/`, `/mens-schedule/:slug/`, `/mens-standings/:slug/`, `/womens-schedule/:slug/`, `/womens-standings/:slug/` | yes |
| Blog posts | 66 | `/blog/YYYY/MM/DD/:slug/` | yes |
| SportsPress standings tables | 19 | `/blog/table/:slug/` | yes |
| SportsPress calendar archive pages | 10 | `/calendar/:slug/` | yes |
| WooCommerce product categories | 14 | `/product-category/.../:slug/` | yes |
| WooCommerce product tags | 10 | `/product-tag/:slug/` | yes |
| **Sitemap subtotal (unique)** | **154** | | |
| WooCommerce products | 42 | `/product/:slug/` | **no** |
| SportsPress events (matches) | 127 | `/blog/event/YYYY/MM/DD/:slug/` | **no** |
| SportsPress teams | 61 | `/blog/team/:slug/` | **no** |
| SportsPress players | 3 | `/blog/player/:slug/` | **no** |
| SportsPress staff | 1 | `/blog/staff/:slug/` | **no** |
| SportsPress venues | 3 | `/blog/venue/:slug/` | **no** |
| SportsPress leagues | 14 | `/blog/league/:slug/` | **no** |
| SportsPress seasons | 5 | `/blog/season/:slug/` | **no** |
| SportsPress calendar posts | 21 | `/blog/calendar/:slug/` | **no** |
| Shop archive | 1 (+ pagination) | `/shop`, `/shop/page/N/` | **no** |
| Cart / Checkout | 2 | `/cart`, `/checkout` (302 → `/cart`) | **no** |
| Login | 1 | `/wp-login.php` | **no** |
| Feeds | 2 | `/feed`, `/comments/feed` | **no** |
| Search | 1 | `/?s=:query` | **no** |
| Blog pagination | N | `/blog/page/N/` | **no** |
| Media attachments | 320 | redirect to `/wp-content/uploads/...` | **no** |
| WP REST API | 1 | `/wp-json/` | **no** |

**Public HTML URLs enumerated: 435** (excluding unbounded pagination, search, feeds, and media redirects).

## Sources

| Source | URL | Result |
| --- | --- | --- |
| Sitemap index | `https://pghrugby.com/sitemap.xml` | 7 sub-sitemaps |
| Sub-sitemaps | `sitemap-misc.xml`, `page-sitemap.xml`, `post-sitemap.xml`, `sp_table-sitemap.xml`, `calendar-sitemap.xml`, `productcat-sitemap.xml`, `producttags-sitemap.xml` | 154 rows, 154 unique |
| WooCommerce products | `https://pghrugby.com/wp-json/wc/v3/products?per_page=100&status=any` | 200, 42 products (app-password auth) |
| SportsPress events | `https://pghrugby.com/wp-json/sportspress/v2/events` | 200, 127 |
| SportsPress tables | `https://pghrugby.com/wp-json/sportspress/v2/tables` | 200, 19 |
| SportsPress teams | `https://pghrugby.com/wp-json/sportspress/v2/teams` | 200, 61 |
| SportsPress players | `https://pghrugby.com/wp-json/sportspress/v2/players` | 200, 3 |
| SportsPress staff | `https://pghrugby.com/wp-json/sportspress/v2/staff` | 200, 1 |
| SportsPress venues | `https://pghrugby.com/wp-json/sportspress/v2/venues` | 200, 3 |
| SportsPress leagues | `https://pghrugby.com/wp-json/sportspress/v2/leagues` | 200, 14 |
| SportsPress seasons | `https://pghrugby.com/wp-json/sportspress/v2/seasons` | 200, 5 |
| SportsPress calendars | `https://pghrugby.com/wp-json/sportspress/v2/calendars` | 200, 21 |
| WooCommerce categories | `https://pghrugby.com/wp-json/wc/v3/products/categories` | 200, 14 |
| WooCommerce tags | `https://pghrugby.com/wp-json/wc/v3/products/tags` | 200, 10 |

## Sitemap-covered URLs

### Home & HTML sitemap (2)

| URL | Title | Shape | Last modified |
| --- | --- | --- | --- |
| `/` | Home | `/` | 2025-06-14 |
| `/sitemap.html` | HTML sitemap | `/:slug/` | 2026-09-27 |

### Pages (33)

| URL | Title | Shape | Last modified |
| --- | --- | --- | --- |
| `/contact` | Contact Us | `/:slug/` | 2026-02-20 |
| `/about` | About Us | `/:slug/` | 2026-05-07 |
| `/membership` | Club Membership | `/:slug/` | 2025-09-03 |
| `/blog` | Club News | `/:slug/` | 2026-01-04 |
| `/womens-club` | Pittsburgh Forge Women's Rugby Club | `/:slug/` | 2025-09-03 |
| `/mens-club` | Pittsburgh Forge Men's Rugby Club | `/:slug/` | 2025-09-03 |
| `/sponsors` | Sponsors - Redirected to Contact | `/:slug/` | 2025-06-14 |
| `/club-bylaws` | Club Bylaws | `/:slug/` | 2025-06-14 |
| `/shop` | Shop | `/:slug/` | 2018-10-29 |
| `/cart` | Cart | `/:slug/` | 2018-05-03 |
| `/checkout` | Checkout | `/:slug/` | 2018-05-03 |
| `/calendar` | Calendar | `/:slug/` | 2018-06-30 |
| `/thank-you-tournament-entry` | Thank You - Tournament Entry | `/:slug/` | 2025-06-14 |
| `/mens-schedule` | Men's Rugby - Season Schedule | `/:slug/` | 2026-09-23 |
| `/womens-schedule` | Women's Rugby - Season Schedule | `/:slug/` | 2026-09-23 |
| `/mens-standings` | Men's Rugby 2025 League Standings | `/:slug/` | 2025-07-17 |
| `/womens-standings` | Women's Rugby 2025 League Standings | `/:slug/` | 2025-07-13 |
| `/thank-you-site-order` | Thank You - Site Order | `/:slug/` | 2025-06-14 |
| `/social-links` | Social Links | `/:slug/` | 2026-09-27 |
| `/covid-19-rtp-plan` | COVID-19 Return to Play Safety Plan | `/:slug/` | 2021-02-01 |
| `/thank-you-donation` | Thank you for your donation! | `/:slug/` | 2025-06-14 |
| `/brendel-scholarship` | Neal R. Brendel Scholarship Fund | `/:slug/` | 2026-08-23 |
| `/player` | Players Catch-Up | `/:slug/` | 2022-09-14 |
| `/player/mens-player` | Men's Player Catch-Up | `/player/:slug/` | 2025-08-15 |
| `/player/womens-player` | Women's Player Catch-Up | `/player/:slug/` | 2025-03-28 |
| `/mens-standings/mens-standings-archive` | Men's Standings - Archive | `/mens-standings/:slug/` | 2025-07-17 |
| `/womens-standings/womens-standing-archive` | Women's Standings - Archive | `/womens-standings/:slug/` | 2025-07-13 |
| `/minutes` | Minutes | `/:slug/` | 2025-06-14 |
| `/merchandise` | Pittsburgh Forge Merchandise | `/:slug/` | 2024-08-23 |
| `/mens-schedule/mens-schedules-archive` | Men's Schedules - Archive | `/mens-schedule/:slug/` | 2025-07-11 |
| `/inclusivity` | Inclusivity Statement | `/:slug/` | 2025-02-06 |
| `/womens-schedule/womens-schedules-archive` | Women's Schedules - Archive | `/womens-schedule/:slug/` | 2025-07-11 |
| `/style-guide` | Style Guide | `/:slug/` | 2025-09-28 |

### Blog posts (66)

| URL | Title | Shape | Last modified |
| --- | --- | --- | --- |
| `/blog/2018/04/09/pittsburgh-forge` | The City’s Newest Club: The Pittsburgh Forge | `/blog/2018/04/09/:slug/` | 2025-06-08 |
| `/blog/2018/05/04/pittsburgh-forge-women-announce-jason-edsall-as-head-coach` | Pittsburgh Forge Women Announce Jason Edsall as Head Coach | `/blog/2018/05/04/:slug/` | 2025-06-08 |
| `/blog/2018/05/04/forge-men-announce-steve-walsh-as-head-d2-coach` | Forge Men Announce Steve Walsh as Head (D2) Coach | `/blog/2018/05/04/:slug/` | 2025-06-08 |
| `/blog/2018/05/08/forge-men-announce-allan-murray-as-assistant-d3-coach` | Forge Men Announce Allan Murray as Assistant/ D3 Coach | `/blog/2018/05/08/:slug/` | 2025-06-08 |
| `/blog/2018/05/23/pittsburgh-celebrates-forge-day` | Pittsburgh Celebrates Forge Day! | `/blog/2018/05/23/:slug/` | 2025-06-08 |
| `/blog/2018/05/30/pittsburgh-forge-partners-with-essmc` | Pittsburgh Forge Partners with ESSMC | `/blog/2018/05/30/:slug/` | 2025-06-08 |
| `/blog/2018/05/31/dugan-associates-supports-pittsburghs-rugby-club` | Dugan & Associates Supports Pittsburgh's Rugby Club | `/blog/2018/05/31/:slug/` | 2025-06-08 |
| `/blog/2018/06/14/mhk-supports-the-pittsburgh-forge` | MHK Supports the Pittsburgh Forge | `/blog/2018/06/14/:slug/` | 2025-06-08 |
| `/blog/2018/07/24/steel-city-7s-recap` | Steel City 7's Recap! | `/blog/2018/07/24/:slug/` | 2025-06-08 |
| `/blog/2018/08/06/forge-men-at-entertain-crowd-at-highmark-stadium` | Forge Men Entertain Crowd at Highmark Stadium | `/blog/2018/08/06/:slug/` | 2025-06-08 |
| `/blog/2018/08/14/forge-men-impressive-in-first-match` | Forge Men Impressive in First Match | `/blog/2018/08/14/:slug/` | 2025-06-08 |
| `/blog/2018/08/21/forge-men-continue-preseason-work-at-wju` | Forge Men Continue Preseason Work at WJU | `/blog/2018/08/21/:slug/` | 2025-06-08 |
| `/blog/2018/08/24/forge-men-look-forward-to-first-league-season` | Forge Men Look Forward to First League Season | `/blog/2018/08/24/:slug/` | 2025-06-08 |
| `/blog/2018/08/27/forge-men-dominate-in-week-one` | Forge Men Dominate in Week One | `/blog/2018/08/27/:slug/` | 2025-06-08 |
| `/blog/2018/08/27/pittsburgh-forge-women-debut-in-columbus-with-a-strong-win` | Forge Women Debut with Strong Win | `/blog/2018/08/27/:slug/` | 2025-06-08 |
| `/blog/2018/09/11/forge-d3-stumble-against-presque-isle` | Forge D3 Stumble Against Presque Isle | `/blog/2018/09/11/:slug/` | 2025-06-08 |
| `/blog/2018/09/11/forge-men-d2-win-big-in-south-buffalo` | Forge Men D2 Win Big in South Buffalo | `/blog/2018/09/11/:slug/` | 2025-06-08 |
| `/blog/2018/09/12/forge-women-earn-first-win-over-south-buffalo` | Forge Women Earn First Win Over South Buffalo | `/blog/2018/09/12/:slug/` | 2025-06-08 |
| `/blog/2018/09/18/forge-d2-drop-heartbreaker-in-cleveland` | Forge D2 Drop Heartbreaker in Cleveland | `/blog/2018/09/18/:slug/` | 2025-06-08 |
| `/blog/2018/09/18/d3-men-make-statement-against-south-pitt` | D3 Men Make Statement Against South Pitt | `/blog/2018/09/18/:slug/` | 2025-06-08 |
| `/blog/2018/09/21/forge-women-stand-over-iron-maidens` | Forge Women Stand Tall Over Cleveland Iron Maidens | `/blog/2018/09/21/:slug/` | 2025-06-08 |
| `/blog/2018/09/26/d2-men-drop-close-match-again` | D2 Men Drop Close Match Again | `/blog/2018/09/26/:slug/` | 2025-06-08 |
| `/blog/2018/09/26/d3-men-continue-to-roll-against-greensburg` | D3 Men Continue to Roll Against Greensburg | `/blog/2018/09/26/:slug/` | 2025-06-08 |
| `/blog/2018/10/05/d3-exact-revenge-on-presque-isle` | D3 Exact Revenge on Presque Isle | `/blog/2018/10/05/:slug/` | 2025-06-08 |
| `/blog/2018/10/05/d2-men-rebound-against-league-best-buffalo` | D2 Men Rebound Against League Best Buffalo | `/blog/2018/10/05/:slug/` | 2025-06-08 |
| `/blog/2018/10/05/forge-women-defend-undefeated-record-with-win-over-buffalo` | Forge Women Defend Undefeated Record with Win Over Buffalo | `/blog/2018/10/05/:slug/` | 2025-06-08 |
| `/blog/2018/10/15/men-split-results-on-forge-day` | Men Split Results on Forge Day | `/blog/2018/10/15/:slug/` | 2025-06-08 |
| `/blog/2018/10/25/d2-men-keep-playoff-hopes-alive-at-home` | D2 Men Keep Playoff Hopes Alive at Home | `/blog/2018/10/25/:slug/` | 2025-06-08 |
| `/blog/2018/10/25/d3-men-drop-wild-game-in-cleveland` | D3 Men Drop Wild Game in Cleveland | `/blog/2018/10/25/:slug/` | 2025-06-08 |
| `/blog/2018/10/29/help-the-forge-go-to-playoffs` | Donate to Help Forge on their Playoff Runs | `/blog/2018/10/29/:slug/` | 2025-06-08 |
| `/blog/2019/01/29/the-forge-elects-inaugural-board-of-directors` | The Forge Elects Inaugural Board of Directors | `/blog/2019/01/29/:slug/` | 2025-06-08 |
| `/blog/2019/02/11/forge-men-play-up-to-d1-competition-this-spring` | Forge Men Play Up to D1 Competition this Spring | `/blog/2019/02/11/:slug/` | 2025-06-08 |
| `/blog/2019/04/10/d2-men-upset-scioto-valley-in-obetz` | D2 Men Upset Scioto Valley in Obetz | `/blog/2019/04/10/:slug/` | 2025-06-08 |
| `/blog/2019/06/03/club-member-spotlight-jaime-filipek` | Club Member Spotlight: Jaime Filipek | `/blog/2019/06/03/:slug/` | 2025-06-08 |
| `/blog/2019/06/04/forge-offers-free-summer-fitness-touch` | Forge Offers Free Summer Fitness & Touch | `/blog/2019/06/04/:slug/` | 2025-06-08 |
| `/blog/2019/06/10/club-member-spotlight-brittany-marnell` | Club Member Spotlight: Brittany Marnell | `/blog/2019/06/10/:slug/` | 2025-06-08 |
| `/blog/2019/06/11/forge-offers-summer-youth-rugby-at-bgcwpa-carnegie` | Forge Offers Summer Youth Rugby at BGCWPA Carnegie! | `/blog/2019/06/11/:slug/` | 2025-06-08 |
| `/blog/2019/06/18/club-member-spotlight-angela-smarto` | Club Member Spotlight: Angela Smarto | `/blog/2019/06/18/:slug/` | 2025-06-08 |
| `/blog/2019/07/01/club-member-spotlight-derek-neubauer` | Club Member Spotlight: Derek Neubauer | `/blog/2019/07/01/:slug/` | 2025-06-08 |
| `/blog/2019/07/09/forge-men-announce-3rd-side-for-fall-2019` | Forge Men Announce 3rd Side for Fall 2019 | `/blog/2019/07/09/:slug/` | 2025-06-08 |
| `/blog/2019/09/06/forge-women-open-season-against-philadelphia` | Forge Women Open Season Against Philadelphia | `/blog/2019/09/06/:slug/` | 2025-06-08 |
| `/blog/2019/09/06/forge-men-excited-for-fall-2019-season` | Forge Men Excited for Fall 2019 Season | `/blog/2019/09/06/:slug/` | 2025-06-08 |
| `/blog/2019/10/22/d2-men-secure-top-seed-in-midwest-eastern-conference` | D2 Men Secure Top Seed in Midwest Eastern Conference | `/blog/2019/10/22/:slug/` | 2025-06-08 |
| `/blog/2019/10/23/forge-women-earn-consecutive-midwest-playoff-berths` | Forge Women Earn Consecutive Midwest Playoff Berths | `/blog/2019/10/23/:slug/` | 2025-06-08 |
| `/blog/2020/01/27/forge-partner-with-iron-city-beer` | Forge Partner with Iron City Beer | `/blog/2020/01/27/:slug/` | 2025-06-08 |
| `/blog/2020/01/28/forge-welcomes-new-directors` | Forge Welcomes New Directors | `/blog/2020/01/28/:slug/` | 2025-06-08 |
| `/blog/2020/02/17/forge-men-announce-qualifying-7s-program` | Forge Men Announce Qualifying 7's Program | `/blog/2020/02/17/:slug/` | 2025-06-08 |
| `/blog/2020/03/30/mens-top-side-promoted-to-d1` | Men's Top Side Promoted to D1 | `/blog/2020/03/30/:slug/` | 2025-06-08 |
| `/blog/2021/01/04/todd-fabec-appointed-womens-side-head-coach` | Todd Fabec Appointed Women's Side Head Coach | `/blog/2021/01/04/:slug/` | 2025-06-08 |
| `/blog/2021/02/04/forge-elects-new-board-of-directors` | Forge Elects New Board of Directors | `/blog/2021/02/04/:slug/` | 2025-06-09 |
| `/blog/2021/09/08/forge-men-bolster-coaching-staff-for-fall-2021` | Forge Men Bolster Coaching Staff for Fall 2021 | `/blog/2021/09/08/:slug/` | 2025-06-09 |
| `/blog/2021/11/02/forge-women-division-1-playoffs-2021` | Forge Women Approach Division 1 Playoffs with “Brake Lines Cut” Mentality | `/blog/2021/11/02/:slug/` | 2025-06-08 |
| `/blog/2022/01/31/forge-men-form-u23-academy` | Forge Men Form U23 Academy | `/blog/2022/01/31/:slug/` | 2025-06-08 |
| `/blog/2022/08/05/forge-rugby-announces-2022-scholarship-winners` | Forge Rugby Announces 2022 Scholarship Winners | `/blog/2022/08/05/:slug/` | 2022-08-05 |
| `/blog/2022/09/30/forge-mens-u23-announces-fall-2022-fixture` | Forge Men's U23 Announces Fall 2022 Fixture | `/blog/2022/09/30/:slug/` | 2022-09-30 |
| `/blog/2023/02/21/forge-men-announce-u23-academy-programming-for-spring-2023` | Forge Men Announce U23 Academy Programming for Spring 2023 | `/blog/2023/02/21/:slug/` | 2023-02-21 |
| `/blog/2023/05/14/forge-rugby-announces-2023-scholarship-winners` | Forge Rugby Announces 2023 Scholarship Winners | `/blog/2023/05/14/:slug/` | 2026-06-03 |
| `/blog/2023/07/03/pittsburgh-forge-looking-to-hire-assistant-coaches` | Pittsburgh Forge Looking to Hire Assistant Coaches | `/blog/2023/07/03/:slug/` | 2025-06-08 |
| `/blog/2024/05/05/pittsburgh-forge-rugby-announces-seth-erwin-as-mens-7s-rugby-coach` | Pittsburgh Forge Rugby announces Seth Erwin as Men's 7s Rugby Coach | `/blog/2024/05/05/:slug/` | 2025-05-26 |
| `/blog/2024/07/13/forge-rugby-announces-2024-scholarship-winners` | Forge Rugby Announces 2024 Scholarship Winners | `/blog/2024/07/13/:slug/` | 2026-06-03 |
| `/blog/2024/07/31/pittsburgh-forge-womens-rugby-team-the-road-to-nationals-2024` | Pittsburgh Forge Women’s Rugby Team: The Road to Nationals 2024 | `/blog/2024/07/31/:slug/` | 2024-07-31 |
| `/blog/2025/05/31/scholarship-recipients-for-2025-announced-by-pittsburgh-forge` | Scholarship Recipients for 2025 Announced by Pittsburgh Forge | `/blog/2025/05/31/:slug/` | 2026-06-03 |
| `/blog/2026/03/13/pittsburgh-forge-partners-with-blackwell-law-firm` | Pittsburgh Forge Partners with Blackwell Law Firm | `/blog/2026/03/13/:slug/` | 2026-03-13 |
| `/blog/2026/03/13/forge-2026-uk-tour` | The Forge Tours the UK: London, Oxford, and Edinburgh | `/blog/2026/03/13/:slug/` | 2026-03-14 |
| `/blog/2026/05/14/forge-rugby-announces-2026-scholarship-winners` | Forge Rugby Announces 2026 Scholarship Winners | `/blog/2026/05/14/:slug/` | 2026-06-03 |
| `/blog/2026/06/29/seeking-coaches` | Seeking Assistant Coaches for Men's and Women's Rugby Teams | `/blog/2026/06/29/:slug/` | 2026-06-30 |

### SportsPress standings tables (19)

| URL | Title | Shape | Last modified |
| --- | --- | --- | --- |
| `/blog/table/league-table` | League Table | `/blog/table/:slug/` | 2022-10-21 |
| `/blog/table/midwest-womens-d1-d2-hybrid-fall-2022` | Midwest Women's D1 & D2 Hybrid - Fall 2022 | `/blog/table/:slug/` | 2023-01-18 |
| `/blog/table/midwest-mens-d3-fall-2022` | Midwest Men's D3 - Fall 2022 | `/blog/table/:slug/` | 2023-01-20 |
| `/blog/table/midwest-premiership-mens-d1-fall-2022` | Midwest Premiership - D1 Men \| Fall 2022 | `/blog/table/:slug/` | 2023-06-24 |
| `/blog/table/midwest-mens-d2-fall-2022` | Midwest Men's D2 - Fall 2022 | `/blog/table/:slug/` | 2023-01-20 |
| `/blog/table/midwest-premiership-mens-d1-fall-2023` | Midwest Premiership - D1 Men \| Fall 2023 | `/blog/table/:slug/` | 2023-11-01 |
| `/blog/table/midwest-mens-d3-fall-2023` | Midwest Men's D3 - Fall 2023 | `/blog/table/:slug/` | 2023-10-20 |
| `/blog/table/midwest-mens-d4-fall-2023` | Midwest Men's D4 - Fall 2023 | `/blog/table/:slug/` | 2023-11-01 |
| `/blog/table/midwest-premiership-mens-d1-fall-2025` | Midwest Premiership - D1 Men \| Fall 2025 | `/blog/table/:slug/` | 2025-11-07 |
| `/blog/table/midwest-mens-d3-fall-2025` | Midwest Men's D3 - Fall 2025 | `/blog/table/:slug/` | 2025-11-07 |
| `/blog/table/midwest-premiership-mens-d1-fall-2024` | Midwest Premiership - D1 Men \| Fall 2024 | `/blog/table/:slug/` | 2024-10-17 |
| `/blog/table/midwest-mens-d3-fall-2024` | Midwest Men's D3 - Fall 2024 | `/blog/table/:slug/` | 2024-10-17 |
| `/blog/table/midwest-mens-d4-fall-2024` | Midwest Men's D4 - Fall 2024 | `/blog/table/:slug/` | 2024-10-17 |
| `/blog/table/midwest-mens-d4-fall-2025` | Midwest Men's D4 - Fall 2025 | `/blog/table/:slug/` | 2025-11-07 |
| `/blog/table/midwest-premiership-d1-women-fall-2025` | Midwest Premiership - D1 Women \| Fall 2025 | `/blog/table/:slug/` | 2025-11-07 |
| `/blog/table/midwest-womens-d2-fall-2025` | Midwest Women's D2 \| Fall 2025 | `/blog/table/:slug/` | 2025-11-07 |
| `/blog/table/midwest-womens-d2-fall-2024` | Midwest Women's D2 \| Fall 2024 | `/blog/table/:slug/` | 2024-10-17 |
| `/blog/table/midwest-premiership-d1-women-fall-2024` | Midwest Premiership - D1 Women \| Fall 2024 | `/blog/table/:slug/` | 2025-07-09 |
| `/blog/table/midwest-premiership-d1-women-fall-2023` | Midwest Premiership - D1 Women \| Fall 2023 | `/blog/table/:slug/` | 2023-11-01 |

### SportsPress calendar archive pages (10)

These are SportsPress calendar *archive* URLs. Some (e.g. `/calendar/events`,
`/calendar/alumni-events`) 301-redirect to `/calendar`; `/calendar/mens-competition` returns 200.

| URL | Title | Shape | Last modified |
| --- | --- | --- | --- |
| `/calendar/events` | Calendar | `/calendar/:slug/` | 2024-08-07 |
| `/calendar/tournaments` | Tournaments | `/calendar/:slug/` | 2023-03-23 |
| `/calendar/mens-competition` | Men's Competition Schedule | `/calendar/:slug/` | 2024-08-07 |
| `/calendar/womens-competition` | Women's Competition Schedule | `/calendar/:slug/` | 2024-08-07 |
| `/calendar/alumni-events` | Calendar | `/calendar/:slug/` | 2023-03-23 |
| `/calendar/fundraising-events` | Fundraising Events | `/calendar/:slug/` | 2023-03-23 |
| `/calendar/social-events` | Social Events | `/calendar/:slug/` | 2023-03-23 |
| `/calendar/training-schedule` | Training Schedule | `/calendar/:slug/` | 2023-03-23 |
| `/calendar/union-events` | Union Events | `/calendar/:slug/` | 2023-03-23 |
| `/calendar/youth-events` | Youth Events | `/calendar/:slug/` | 2018-06-30 |

### WooCommerce product categories (14)

| URL | Title | Shape | Last modified |
| --- | --- | --- | --- |
| `/product-category/uncategorized` | Uncategorized | `/product-category/:slug/` | 2025-10-07 |
| `/product-category/events/5k-walk-run` | 5k Walk/Run | `/product-category/events/:slug/` | 2023-08-07 |
| `/product-category/alumni` | Alumni | `/product-category/:slug/` | 2024-07-13 |
| `/product-category/events/ballpark-day` | Ballpark Day | `/product-category/events/:slug/` | 2023-06-24 |
| `/product-category/donation` | Donation | `/product-category/:slug/` | 2025-09-21 |
| `/product-category/events` | Events | `/product-category/:slug/` | 2026-09-01 |
| `/product-category/events/gala` | Gala | `/product-category/events/:slug/` | 2024-05-02 |
| `/product-category/events/golf-outing` | Golf Outing | `/product-category/events/:slug/` | 2026-09-01 |
| `/product-category/events/golf-outing/golf-outing-sponsorship` | Golf Outing Sponsorship | `/product-category/events/golf-outing/:slug/` | 2026-09-01 |
| `/product-category/membership` | Membership | `/product-category/:slug/` | 2026-03-30 |
| `/product-category/events/pig-roast` | Pig Roast | `/product-category/events/:slug/` | 2026-07-05 |
| `/product-category/events/pr7s` | PR7s | `/product-category/events/:slug/` | 2024-07-13 |
| `/product-category/events/schools-out-7s` | Schools Out 7s | `/product-category/events/:slug/` | 2024-07-13 |
| `/product-category/steel-city-7s` | Steel City 7s | `/product-category/:slug/` | 2026-07-07 |

### WooCommerce product tags (10)

| URL | Title | Shape | Last modified |
| --- | --- | --- | --- |
| `/product-tag/7s-rugby` | 7s rugby | `/product-tag/:slug/` | 2024-07-13 |
| `/product-tag/pittsburgh` | pittsburgh | `/product-tag/:slug/` | 2024-05-02 |
| `/product-tag/pittsburgh-brewing-company` | pittsburgh brewing company | `/product-tag/:slug/` | 2024-05-02 |
| `/product-tag/pittsburgh-forge-rugby` | pittsburgh forge rugby | `/product-tag/:slug/` | 2024-05-02 |
| `/product-tag/pittsburgh-rugby` | pittsburgh rugby | `/product-tag/:slug/` | 2024-07-13 |
| `/product-tag/pittsburgh-sports` | pittsburgh sports | `/product-tag/:slug/` | 2024-05-02 |
| `/product-tag/premier-rugby-sevens` | premier rugby sevens | `/product-tag/:slug/` | 2024-07-13 |
| `/product-tag/rugby` | rugby | `/product-tag/:slug/` | 2024-07-13 |
| `/product-tag/sports` | sports | `/product-tag/:slug/` | 2024-05-02 |
| `/product-tag/tournament` | tournament | `/product-tag/:slug/` | 2024-07-13 |

## URL types NOT covered by the sitemap

The sitemap generator omits WooCommerce products and all SportsPress content types
(events, teams, players, staff, venues, leagues, seasons, calendar posts). These are
enumerated below from the REST APIs.

### WooCommerce products (42)

Shape: `/product/:slug/`. All 42 are `publish`; types: 31 simple, 5 `woosg` (Smart Groups),
4 variable, 2 grouped. The public `wc/store/v1/products` endpoint exposes only 15; the
authenticated `wc/v3` endpoint returns all 42.

| URL | Title | Shape | Last modified |
| --- | --- | --- | --- |
| `/product/steelers-raffle` | Steelers Raffle | `/product/:slug/` | 2025-10-06 |
| `/product/dues-spring` | Dues - Spring | `/product/:slug/` | 2026-03-30 |
| `/product/dues-fall` | Dues - Fall | `/product/:slug/` | 2026-01-30 |
| `/product/sc7s-mens-social-division` | Men's Social Division | `/product/:slug/` | 2026-07-07 |
| `/product/sc7s-womens-additional-side` | Women's Additional Side | `/product/:slug/` | 2026-07-07 |
| `/product/sc7s-mens-additional-side` | Men's Additional Side | `/product/:slug/` | 2026-07-07 |
| `/product/sc7s-mens-super-social-division` | Men's Super Social Division | `/product/:slug/` | 2026-07-07 |
| `/product/sc7s-mens-open-division` | Men's Open Division | `/product/:slug/` | 2026-07-07 |
| `/product/sc7s-womens-open-division` | Women's Open Division | `/product/:slug/` | 2026-07-07 |
| `/product/sc7s-womens-social-division` | Women's Social Division | `/product/:slug/` | 2026-07-07 |
| `/product/gala-ticket-non-member` | Gala Ticket - Non-Member | `/product/:slug/` | 2024-05-02 |
| `/product/gala-ticket-club-member` | Gala Ticket - Club Member | `/product/:slug/` | 2024-05-02 |
| `/product/gala-tickets` | Pittsburgh Forge Gala Tickets | `/product/:slug/` | 2024-05-02 |
| `/product/tailgate` | 2023 Alumni & Supporter Tailgate | `/product/:slug/` | 2024-07-13 |
| `/product/5k` | 5k Run/Walk for Charity | `/product/:slug/` | 2023-08-07 |
| `/product/5k-kid` | Kid 5k Participant | `/product/:slug/` | 2023-08-07 |
| `/product/5k-virtual` | Virtual 5k Participant | `/product/:slug/` | 2023-08-07 |
| `/product/5k-in-person` | In-Person 5k Participant | `/product/:slug/` | 2023-08-07 |
| `/product/ballpark-ticket-16-under` | 16-or-Under Ballpark Ticket | `/product/:slug/` | 2023-06-24 |
| `/product/ballpark-day-adult` | Ballpark Day Adult | `/product/:slug/` | 2023-06-24 |
| `/product/ballpark-day` | Forge Day at the Ballpark | `/product/:slug/` | 2023-06-24 |
| `/product/schools-out-7s` | Schools Out 7s | `/product/:slug/` | 2024-07-13 |
| `/product/pr7s` | PR7s Eastern Conference Finals - Ticket | `/product/:slug/` | 2024-07-13 |
| `/product/nfl-survivor-pool-insurance` | NFL Survivor Pool Insurance | `/product/:slug/` | 2023-06-24 |
| `/product/nfl-survivor-pool-ticket` | NFL Survivor Pool Ticket | `/product/:slug/` | 2023-06-24 |
| `/product/steel-city-7s-bar-crawl` | Steel City 7s Bar Crawl | `/product/:slug/` | 2022-06-23 |
| `/product/pass-the-hat` | "Pass the Hat" Fund | `/product/:slug/` | 2025-09-21 |
| `/product/dues` | Team Dues | `/product/:slug/` | 2026-03-30 |
| `/product/alumni-match-jersey` | Alumni Match Jersey | `/product/:slug/` | 2023-06-24 |
| `/product/golf-outing-all-you-can-drink` | All You Can Drink | `/product/:slug/` | 2021-10-02 |
| `/product/annual-forge-pig-roast` | Annual Forge Pig Roast Ticket | `/product/:slug/` | 2026-07-05 |
| `/product/golf-outing-registration` | Golf Outing Registration | `/product/:slug/` | 2026-09-01 |
| `/product/mulligan` | Mulligan (includes 4 mulligans & 1 contest entry for each player in the group) | `/product/:slug/` | 2020-08-19 |
| `/product/steel-city-7s-registration` | Steel City 7s Registration | `/product/:slug/` | 2026-05-05 |
| `/product/march-madness-square-pool` | March Madness Square Pool Entry | `/product/:slug/` | 2019-04-30 |
| `/product/winter-flag-league-entry` | Winter Flag Rugby League Entry | `/product/:slug/` | 2018-12-18 |
| `/product/club-donation` | Club Donation | `/product/:slug/` | 2023-10-12 |
| `/product/survivor-pool` | Pittsburgh Forge NFL Survivor Pool | `/product/:slug/` | 2026-05-04 |
| `/product/golf-outing-ticket` | Golf Outing Ticket | `/product/:slug/` | 2026-08-22 |
| `/product/golf-outing-sponsorship` | Golf Outing Sponsorship | `/product/:slug/` | 2026-09-01 |
| `/product/supporter-dues` | Supporter Dues | `/product/:slug/` | 2024-07-13 |
| `/product/team-dues` | Dues | `/product/:slug/` | 2024-08-08 |

### SportsPress events / matches (127)

Shape: `/blog/event/YYYY/MM/DD/:slug/`. Date path is the event date.

| URL | Title | Shape | Last modified |
| --- | --- | --- | --- |
| `/blog/event/2025/11/15/forge-women-d1-vs-chicago-north-shore` | Forge Women D1 vs Chicago North Shore | `/blog/event/2025/11/15/:slug/` | 2025-11-15 |
| `/blog/event/2025/11/08/forge-women-d1-vs-metropolis-valkyries-2` | Forge Women D1 vs Metropolis Valkyries | `/blog/event/2025/11/08/:slug/` | 2025-11-08 |
| `/blog/event/2025/10/25/forge-men-d1-vs-detroit-tradesmen-3` | Forge Men D1 vs Detroit Tradesmen | `/blog/event/2025/10/25/:slug/` | 2025-10-25 |
| `/blog/event/2025/10/25/buffalo-rugby-club-vs-forge-women-d2-2` | Buffalo Rugby Club vs Forge Women D2 | `/blog/event/2025/10/25/:slug/` | 2025-10-25 |
| `/blog/event/2025/10/18/indianapolis-impalas-d1-vs-forge-men-d1` | Indianapolis Impalas D1 vs Forge Men D1 | `/blog/event/2025/10/18/:slug/` | 2025-10-18 |
| `/blog/event/2025/10/18/grand-rapids-growlers-vs-forge-women-d1` | Grand Rapids Growlers vs Forge Women D1 | `/blog/event/2025/10/18/:slug/` | 2025-10-18 |
| `/blog/event/2025/10/18/cincinnati-kelts-vs-forge-men-d3` | Cincinnati Kelts vs Forge Men D3 | `/blog/event/2025/10/18/:slug/` | 2025-10-18 |
| `/blog/event/2025/10/11/forge-men-d3-vs-canton-rugby-2` | Forge Men D3 vs Canton Rugby | `/blog/event/2025/10/11/:slug/` | 2025-10-11 |
| `/blog/event/2025/10/11/forge-men-d1-vs-cincinnati-wolfhounds-3` | Forge Men D1 vs Cincinnati Wolfhounds | `/blog/event/2025/10/11/:slug/` | 2025-10-11 |
| `/blog/event/2025/10/11/forge-women-d1-vs-columbus-womens-rugby-3` | Forge Women D1 vs Columbus Women's Rugby | `/blog/event/2025/10/11/:slug/` | 2025-10-11 |
| `/blog/event/2025/10/11/akron-rfc-vs-forge-women-d2` | Akron RFC vs Forge Women D2 | `/blog/event/2025/10/11/:slug/` | 2025-10-11 |
| `/blog/event/2025/10/04/forge-men-d4-vs-columbus-coyotes` | Forge Men D4 vs Columbus Coyotes | `/blog/event/2025/10/04/:slug/` | 2025-10-04 |
| `/blog/event/2025/10/04/forge-men-d3-vs-greensburg-rfc-2` | Forge Men D3 vs Greensburg RFC | `/blog/event/2025/10/04/:slug/` | 2025-10-04 |
| `/blog/event/2025/10/04/forge-women-d1-vs-detroit-rfc-3` | Forge Women D1 vs Detroit RFC | `/blog/event/2025/10/04/:slug/` | 2025-10-04 |
| `/blog/event/2025/10/04/forge-women-d2-vs-cleveland-iron-maidens` | Forge Women D2 vs Cleveland Iron Maidens | `/blog/event/2025/10/04/:slug/` | 2025-10-04 |
| `/blog/event/2025/09/27/chicago-griffins-vs-forge-men-d1-3` | Chicago Griffins vs Forge Men D1 | `/blog/event/2025/09/27/:slug/` | 2025-09-27 |
| `/blog/event/2025/09/27/marysville-vs-forge-men-d4` | Marysville vs Forge Men D4 | `/blog/event/2025/09/27/:slug/` | 2025-09-27 |
| `/blog/event/2025/09/27/columbus-womens-rugby-vs-forge-women-d1-3` | Columbus Women's Rugby vs Forge Women D1 | `/blog/event/2025/09/27/:slug/` | 2025-09-27 |
| `/blog/event/2025/09/27/columbus-womens-rugby-vs-forge-women-d2` | Columbus Women's Rugby vs Forge Women D2 | `/blog/event/2025/09/27/:slug/` | 2025-09-27 |
| `/blog/event/2025/09/20/detroit-tradesmen-vs-forge-men-d1-3` | Detroit Tradesmen vs Forge Men D1 | `/blog/event/2025/09/20/:slug/` | 2025-09-20 |
| `/blog/event/2025/09/20/cleveland-rovers-vs-forge-men-d3-2` | Cleveland Rovers vs Forge Men D3 | `/blog/event/2025/09/20/:slug/` | 2025-09-20 |
| `/blog/event/2025/09/13/cincinnati-wolfhounds-vs-forge-men-d1-2` | Cincinnati Wolfhounds vs Forge Men D1 | `/blog/event/2025/09/13/:slug/` | 2025-09-13 |
| `/blog/event/2025/09/13/erie-rugby-vs-forge-men-d3` | Erie Rugby vs Forge Men D3 | `/blog/event/2025/09/13/:slug/` | 2025-09-13 |
| `/blog/event/2025/09/13/forge-women-d1-vs-cincinnati-kelts-3` | Forge Women D1 vs Cincinnati Kelts | `/blog/event/2025/09/13/:slug/` | 2025-09-13 |
| `/blog/event/2025/09/13/forge-women-d2-vs-dayton-area-rc` | Forge Women D2 vs Dayton Area RC | `/blog/event/2025/09/13/:slug/` | 2025-09-13 |
| `/blog/event/2025/09/06/forge-men-d1-vs-indianapolis-impalas-d1` | Forge Men D1 vs Indianapolis Impalas D1 | `/blog/event/2025/09/06/:slug/` | 2025-09-06 |
| `/blog/event/2025/09/06/forge-men-d4-vs-south-pittsburgh-hooligans-rfc-2` | Forge Men D4 vs South Pittsburgh Hooligans RFC | `/blog/event/2025/09/06/:slug/` | 2025-09-06 |
| `/blog/event/2025/09/06/forge-men-d3-vs-cleveland-crusaders-2` | Forge Men D3 vs Cleveland Crusaders | `/blog/event/2025/09/06/:slug/` | 2025-09-06 |
| `/blog/event/2025/09/06/forge-women-d1-vs-growlers` | Forge Women D1 vs Growlers | `/blog/event/2025/09/06/:slug/` | 2025-09-06 |
| `/blog/event/2025/08/30/pittsburgh-harlequins-vs-forge-men-d4` | Pittsburgh Harlequins vs Forge Men D4 | `/blog/event/2025/08/30/:slug/` | 2025-08-30 |
| `/blog/event/2025/08/30/detroit-rfc-vs-forge-women-d1-2` | Detroit RFC vs Forge Women D1 | `/blog/event/2025/08/30/:slug/` | 2025-08-30 |
| `/blog/event/2025/08/23/forge-men-d1-vs-chicago-griffins-3` | Forge Men D1 vs Chicago Griffins | `/blog/event/2025/08/23/:slug/` | 2025-08-23 |
| `/blog/event/2025/08/23/forge-men-d4-vs-findlay-rfc` | Forge Men D4 vs Findlay RFC | `/blog/event/2025/08/23/:slug/` | 2025-08-23 |
| `/blog/event/2025/08/23/cincinnati-kelts-vs-forge-women-d1-3` | Cincinnati Kelts vs Forge Women D1 | `/blog/event/2025/08/23/:slug/` | 2025-08-23 |
| `/blog/event/2024/11/02/forge-women-d1-vs-metropolis-valkyries` | Forge Women D1 vs Metropolis Valkyries | `/blog/event/2024/11/02/:slug/` | 2024-11-02 |
| `/blog/event/2024/10/26/st-louis-bombers-vs-forge-men-d1` | St. Louis Bombers vs Forge Men D1 | `/blog/event/2024/10/26/:slug/` | 2024-10-26 |
| `/blog/event/2024/10/19/forge-women-d1-vs-cincinnati-kelts-2` | Forge Women D1 vs Cincinnati Kelts | `/blog/event/2024/10/19/:slug/` | 2024-10-19 |
| `/blog/event/2024/10/12/chicago-griffins-vs-forge-men-d1-2` | Forge Men D1 @ Chicago Griffins | `/blog/event/2024/10/12/:slug/` | 2024-10-12 |
| `/blog/event/2024/10/12/canton-rugby-vs-forge-men-d3` | Forge Men D3 @ Canton Rugby | `/blog/event/2024/10/12/:slug/` | 2024-10-12 |
| `/blog/event/2024/10/12/columbus-womens-rugby-vs-forge-women-d1-2` | Forge Women D1 @ Columbus Women's Rugby | `/blog/event/2024/10/12/:slug/` | 2024-10-12 |
| `/blog/event/2024/10/12/buffalo-rugby-club-vs-forge-women-d2` | Forge Women D2 @ Buffalo Rugby Club | `/blog/event/2024/10/12/:slug/` | 2024-10-12 |
| `/blog/event/2024/10/05/forge-men-d4-vs-columbus-castaways` | Forge Men D4 vs Columbus Castaways | `/blog/event/2024/10/05/:slug/` | 2024-10-05 |
| `/blog/event/2024/10/05/forge-men-d1-vs-detroit-tradesmen-2` | Forge Men D1 vs Detroit Tradesmen | `/blog/event/2024/10/05/:slug/` | 2024-10-05 |
| `/blog/event/2024/10/05/forge-women-d1-vs-detroit-rfc-2` | Forge Women D1 vs Detroit RFC | `/blog/event/2024/10/05/:slug/` | 2024-10-05 |
| `/blog/event/2024/09/28/ypsilanti-rugby-club-vs-forge-men-d4` | Forge Men D4 @ Ypsilanti Rugby Club | `/blog/event/2024/09/28/:slug/` | 2024-09-28 |
| `/blog/event/2024/09/28/forge-men-d3-vs-presque-isle-rfc` | Forge Men D3 vs Presque Isle RFC | `/blog/event/2024/09/28/:slug/` | 2024-09-28 |
| `/blog/event/2024/09/28/south-buffalo-rugby-vs-forge-women-d2` | Forge Women D2 @ South Buffalo Rugby | `/blog/event/2024/09/28/:slug/` | 2024-09-28 |
| `/blog/event/2024/09/28/cincinnati-wolfhounds-vs-forge-men-d1` | Forge Men D1 @ Cincinnati Wolfhounds | `/blog/event/2024/09/28/:slug/` | 2024-09-28 |
| `/blog/event/2024/09/28/cincinnati-kelts-vs-forge-women-d1-2` | Forge Women D1 @ Cincinnati Kelts | `/blog/event/2024/09/28/:slug/` | 2024-09-28 |
| `/blog/event/2024/09/21/forge-men-d1-vs-chicago-griffins-2` | Forge Men D1 vs Chicago Griffins | `/blog/event/2024/09/21/:slug/` | 2024-09-21 |
| `/blog/event/2024/09/21/forge-men-d3-vs-cleveland-rovers` | Forge Men D3 vs Cleveland Rovers | `/blog/event/2024/09/21/:slug/` | 2024-09-21 |
| `/blog/event/2024/09/21/forge-women-d2-vs-uticuse-rugby-club` | Forge Women D2 vs Uticuse Rugby Club | `/blog/event/2024/09/21/:slug/` | 2024-09-21 |
| `/blog/event/2024/09/14/detroit-tradesmen-vs-forge-men-d1-2` | Forge Men D1 @ Detroit Tradesmen | `/blog/event/2024/09/14/:slug/` | 2024-09-14 |
| `/blog/event/2024/09/14/forge-women-d2-vs-north-buffalo` | Forge Women D2 vs North Buffalo | `/blog/event/2024/09/14/:slug/` | 2024-09-14 |
| `/blog/event/2024/09/14/greensburg-rfc-vs-forge-men-d3` | Forge Men D3 @ Greensburg RFC | `/blog/event/2024/09/14/:slug/` | 2024-09-14 |
| `/blog/event/2024/09/14/forge-women-d1-vs-columbus-womens-rugby-2` | Forge Women D1 vs Columbus Women's Rugby | `/blog/event/2024/09/14/:slug/` | 2024-09-14 |
| `/blog/event/2024/09/07/forge-men-d1-vs-cincinnati-wolfhounds-2` | Forge Men D1 vs Cincinnati Wolfhounds | `/blog/event/2024/09/07/:slug/` | 2024-09-07 |
| `/blog/event/2024/09/07/findlay-rfc-vs-forge-men-d4` | Forge Men D4 @ Findlay RFC | `/blog/event/2024/09/07/:slug/` | 2024-09-07 |
| `/blog/event/2024/09/07/detroit-rfc-vs-forge-women-d1` | Forge Women D1 @ Detroit RFC | `/blog/event/2024/09/07/:slug/` | 2024-09-07 |
| `/blog/event/2024/09/07/rochester-renegades-vs-forge-women` | Forge Women D2 @ Rochester Renegades | `/blog/event/2024/09/07/:slug/` | 2024-09-07 |
| `/blog/event/2024/08/31/forge-men-d3-vs-south-pittsburgh-hooligans-rfc` | Forge Men D3 vs South Pittsburgh Hooligans RFC | `/blog/event/2024/08/31/:slug/` | 2024-08-31 |
| `/blog/event/2024/08/31/forge-men-d4-vs-south-pittsburgh-hooligans-rfc` | Forge Men D4 vs South Pittsburgh Hooligans RFC | `/blog/event/2024/08/31/:slug/` | 2024-08-31 |
| `/blog/event/2024/08/24/cleveland-crusaders-vs-forge-men-d3` | Forge Men D3 @ Cleveland Crusaders | `/blog/event/2024/08/24/:slug/` | 2024-08-24 |
| `/blog/event/2024/05/17/forge-women-d1-vs-utah-vipers` | Forge Women D1 vs Utah Vipers | `/blog/event/2024/05/17/:slug/` | 2024-05-17 |
| `/blog/event/2023/11/11/forge-women-d1-vs-columbus-womens-rugby` | Forge Women D1 vs Columbus Women's Rugby | `/blog/event/2023/11/11/:slug/` | 2023-11-11 |
| `/blog/event/2023/11/04/forge-women-d1-vs-chicago-lions` | Forge Women D1 vs Chicago Lions | `/blog/event/2023/11/04/:slug/` | 2023-11-04 |
| `/blog/event/2023/10/28/ucwrfc-vs-forge-women-gold` | UCWRFC vs Forge Women - Gold | `/blog/event/2023/10/28/:slug/` | 2023-10-28 |
| `/blog/event/2023/10/28/westside-outcasts-vs-forge-men-d4` | Westside Outcasts vs Forge Men D4 | `/blog/event/2023/10/28/:slug/` | 2023-10-28 |
| `/blog/event/2023/10/28/cincinnati-kelts-vs-forge-women-d1` | Cincinnati Kelts vs Forge Women D1 | `/blog/event/2023/10/28/:slug/` | 2023-10-28 |
| `/blog/event/2023/10/21/chicago-griffins-vs-forge-men-d1` | Chicago Griffins vs Forge Men D1 | `/blog/event/2023/10/21/:slug/` | 2023-10-21 |
| `/blog/event/2023/10/21/forge-men-d4-vs-detroit-rfc-2` | Forge Men D4 vs Detroit RFC | `/blog/event/2023/10/21/:slug/` | 2023-10-21 |
| `/blog/event/2023/10/21/forge-women-d1-vs-buffalo-rugby-club` | Forge Women D1 vs Buffalo Rugby Club | `/blog/event/2023/10/21/:slug/` | 2023-10-21 |
| `/blog/event/2023/10/14/forge-men-d4-vs-columbus-castaways-d4` | Forge Men D4 vs Columbus Castaways | `/blog/event/2023/10/14/:slug/` | 2023-10-14 |
| `/blog/event/2023/10/14/forge-men-d1-vs-detroit-tradesmen` | Forge Men D1 vs Detroit Tradesmen | `/blog/event/2023/10/14/:slug/` | 2023-10-14 |
| `/blog/event/2023/10/14/columbus-womens-rugby-vs-forge-women-d1` | Columbus Women's Rugby vs Forge Women D1 | `/blog/event/2023/10/14/:slug/` | 2023-10-14 |
| `/blog/event/2023/10/14/columbus-womens-rugby-vs-forge-women-gold` | Columbus Women's Rugby vs Forge Women D1 (Copy) | `/blog/event/2023/10/14/:slug/` | 2023-10-14 |
| `/blog/event/2023/10/14/forge-men-d3-vs-canton-rugby` | Forge Men D3 vs Canton Rugby | `/blog/event/2023/10/14/:slug/` | 2023-10-14 |
| `/blog/event/2023/10/07/forge-men-d1-vs-cincinnati-wolfhounds` | Forge Men D1 vs Cincinnati Wolfhounds | `/blog/event/2023/10/07/:slug/` | 2023-10-07 |
| `/blog/event/2023/10/07/dayton-area-rc-vs-forge-men-d4` | Dayton Area RC vs Forge Men D4 | `/blog/event/2023/10/07/:slug/` | 2023-10-07 |
| `/blog/event/2023/10/07/forge-women-d1-vs-detroit-rfc` | Forge Women D1 vs Detroit RFC | `/blog/event/2023/10/07/:slug/` | 2023-10-07 |
| `/blog/event/2023/09/30/cleveland-crusaders-vs-forge-men-d1` | Cleveland Crusaders vs Forge Men D1 | `/blog/event/2023/09/30/:slug/` | 2023-09-30 |
| `/blog/event/2023/09/30/presque-isle-rfc-vs-forge-men-d3` | Presque Isle RFC vs Forge Men D3 | `/blog/event/2023/09/30/:slug/` | 2023-09-30 |
| `/blog/event/2023/09/23/cleveland-rovers-vs-forge-men-d4` | Cleveland Rovers vs Forge Men D4 | `/blog/event/2023/09/23/:slug/` | 2023-09-23 |
| `/blog/event/2023/09/23/cleveland-rovers-vs-forge-men-d3` | Cleveland Rovers vs Forge Men D3 | `/blog/event/2023/09/23/:slug/` | 2023-09-23 |
| `/blog/event/2023/09/23/forge-women-d1-vs-cincinnati-kelts` | Forge Women D1 vs Cincinnati Kelts | `/blog/event/2023/09/23/:slug/` | 2023-09-23 |
| `/blog/event/2023/09/16/forge-men-d1-vs-chicago-griffins` | Forge Men D1 vs Chicago Griffins | `/blog/event/2023/09/16/:slug/` | 2023-09-16 |
| `/blog/event/2023/09/16/forge-men-d4-vs-detroit-rfc` | Forge Men D4 vs Detroit RFC | `/blog/event/2023/09/16/:slug/` | 2023-09-16 |
| `/blog/event/2023/09/16/buffalo-rugby-club-vs-forge-women-d1` | Buffalo Rugby Club vs Forge Women D1 | `/blog/event/2023/09/16/:slug/` | 2023-09-16 |
| `/blog/event/2023/09/16/forge-men-d3-vs-greensburg-rfc` | Forge Men D3 vs Greensburg RFC | `/blog/event/2023/09/16/:slug/` | 2023-09-16 |
| `/blog/event/2023/09/09/forge-women-gold-vs-columbus-womens-rugby` | Forge Women - Gold vs Columbus Women's Rugby | `/blog/event/2023/09/09/:slug/` | 2023-09-09 |
| `/blog/event/2023/09/09/detroit-tradesmen-vs-forge-men-d1` | Detroit Tradesmen vs Forge Men D1 | `/blog/event/2023/09/09/:slug/` | 2023-09-09 |
| `/blog/event/2023/09/09/south-pittsburgh-hooligans-rfc-vs-forge-men-d3` | South Pittsburgh Hooligans RFC vs Forge Men D3 | `/blog/event/2023/09/09/:slug/` | 2023-09-09 |
| `/blog/event/2023/09/09/pittsburgh-forge-women-d1-vs-columbus-womens-rugby-2` | Forge Women D1 vs Columbus Women's Rugby | `/blog/event/2023/09/09/:slug/` | 2023-09-09 |
| `/blog/event/2023/09/02/cincinnati-wolfhounds-vs-pittsburgh-forge-men-d1-2` | Cincinnati Wolfhounds vs Forge Men D1 | `/blog/event/2023/09/02/:slug/` | 2023-09-02 |
| `/blog/event/2023/09/02/detroit-rfc-vs-pittsburgh-forge-women-d12` | Detroit RFC vs Forge Women D1 | `/blog/event/2023/09/02/:slug/` | 2023-09-02 |
| `/blog/event/2023/09/02/columbus-in-vs-forge-men-d4` | Columbus (IN) vs Forge Men D4 | `/blog/event/2023/09/02/:slug/` | 2023-09-02 |
| `/blog/event/2023/08/26/pittsburgh-forge-men-d3-vs-cleveland-crusaders-3` | Forge Men D3 vs Cleveland Crusaders | `/blog/event/2023/08/26/:slug/` | 2023-08-26 |
| `/blog/event/2023/08/26/pittsburgh-forge-men-d1-vs-cleveland-crusaders-2` | Forge Men D1 vs Cleveland Crusaders | `/blog/event/2023/08/26/:slug/` | 2023-08-26 |
| `/blog/event/2023/08/26/pittsburgh-forge-men-d4-vs-marysville` | Forge Men D4 vs Marysville | `/blog/event/2023/08/26/:slug/` | 2023-08-26 |
| `/blog/event/2022/11/05/pittsburgh-forge-vs-chicago-lions-2` | Pittsburgh Forge D1 Women vs Chicago Lions | `/blog/event/2022/11/05/:slug/` | 2022-11-05 |
| `/blog/event/2022/11/05/pittsburgh-forge-vs-detroit-tradesmen` | Pittsburgh Forge D1 Men vs Detroit Tradesmen | `/blog/event/2022/11/05/:slug/` | 2022-11-05 |
| `/blog/event/2022/10/29/chicago-rugby-club-vs-pittsburgh-forge` | Chicago Griffins vs Pittsburgh Forge D1 Men | `/blog/event/2022/10/29/:slug/` | 2022-10-29 |
| `/blog/event/2022/10/29/columbus-rugby-club-vs-pittsburgh-forge-d2-men` | Columbus Rugby Club vs Pittsburgh Forge D2 Men | `/blog/event/2022/10/29/:slug/` | 2022-10-29 |
| `/blog/event/2022/10/22/pittsburgh-forge-vs-cleveland-crusaders` | Pittsburgh Forge D1 Men vs Cleveland Crusaders | `/blog/event/2022/10/22/:slug/` | 2022-10-22 |
| `/blog/event/2022/10/22/pittsburgh-forge-vs-indianapolis-impalas` | Pittsburgh Forge D2 Men vs Indianapolis Impalas | `/blog/event/2022/10/22/:slug/` | 2022-10-22 |
| `/blog/event/2022/10/15/cincinnati-wolfhounds-vs-pittsburgh-forge` | Cincinnati Wolfhounds vs Pittsburgh Forge D1 Men | `/blog/event/2022/10/15/:slug/` | 2022-10-15 |
| `/blog/event/2022/10/15/queen-city-rugby-club-vs-pittsburgh-forge-d2-men` | Queen City Rugby Club vs Pittsburgh Forge D2 Men | `/blog/event/2022/10/15/:slug/` | 2022-10-15 |
| `/blog/event/2022/10/15/buffalo-womens-rugby-club-vs-pittsburgh-forge-women` | Buffalo Women’s Rugby Club vs Pittsburgh Forge Women | `/blog/event/2022/10/15/:slug/` | 2022-10-15 |
| `/blog/event/2022/10/08/pittsburgh-forge-vs-chicago-lions` | Pittsburgh Forge D1 Men vs Chicago Lions | `/blog/event/2022/10/08/:slug/` | 2022-10-08 |
| `/blog/event/2022/10/08/pittsburgh-forge-vs-columbus-womens-rugby` | Pittsburgh Forge Women vs Columbus Women's Rugby | `/blog/event/2022/10/08/:slug/` | 2022-10-08 |
| `/blog/event/2022/10/08/pittsburgh-forge-d2-men-vs-akron-rfc` | Pittsburgh Forge D2 Men vs Akron RFC | `/blog/event/2022/10/08/:slug/` | 2022-10-08 |
| `/blog/event/2022/10/08/pittsburgh-forge-vs-harrisburg-rugby-club` | Pittsburgh Forge - Gold vs Harrisburg Rugby Club | `/blog/event/2022/10/08/:slug/` | 2022-10-08 |
| `/blog/event/2022/09/24/detroit-tradesmen-vs-pittsburgh-forge` | Detroit Tradesmen vs Pittsburgh Forge D1 Men | `/blog/event/2022/09/24/:slug/` | 2022-09-24 |
| `/blog/event/2022/09/24/detroit-rfc-vs-pittsburgh-forge-gold` | Detroit RFC vs Pittsburgh Forge - Gold | `/blog/event/2022/09/24/:slug/` | 2022-09-24 |
| `/blog/event/2022/09/24/indianapolis-impalas-vs-pittsburgh-forge-d2-men` | Indianapolis Impalas vs Pittsburgh Forge D2 Men | `/blog/event/2022/09/24/:slug/` | 2022-09-24 |
| `/blog/event/2022/09/24/detroit-rfc-vs-pittsburgh-forge` | Detroit RFC vs Pittsburgh Forge Women | `/blog/event/2022/09/24/:slug/` | 2022-09-24 |
| `/blog/event/2022/09/17/pittsburgh-forge-vs-chicago-griffins` | Pittsburgh Forge D1 Men vs Chicago Griffins | `/blog/event/2022/09/17/:slug/` | 2022-09-17 |
| `/blog/event/2022/09/17/pittsburgh-forge-d2-men-vs-columbus-rugby-club` | Pittsburgh Forge D2 Men vs Columbus Rugby Club | `/blog/event/2022/09/17/:slug/` | 2022-09-17 |
| `/blog/event/2022/09/17/pittsburgh-forge-gold-vs-kent-state-womens-rugby-club` | Pittsburgh Forge - Gold vs Kent State Women’s Rugby Club | `/blog/event/2022/09/17/:slug/` | 2022-09-17 |
| `/blog/event/2022/09/10/cleveland-crusaders-d1-vs-pittsburgh-forge` | Cleveland Crusaders vs Pittsburgh Forge D1 Men | `/blog/event/2022/09/10/:slug/` | 2022-09-10 |
| `/blog/event/2022/09/10/akron-rfc-vs-pittsburgh-forge-d2-men` | Akron RFC vs Pittsburgh Forge D2 Men | `/blog/event/2022/09/10/:slug/` | 2022-09-10 |
| `/blog/event/2022/09/10/pittsburgh-forge-gold-vs-cincinnati-kelts-b` | Pittsburgh Forge - Gold vs Cincinnati Kelts | `/blog/event/2022/09/10/:slug/` | 2022-09-10 |
| `/blog/event/2022/09/10/pittsburgh-forge-vs-cincinnati-kelts` | Pittsburgh Forge Women vs Cincinnati Kelts | `/blog/event/2022/09/10/:slug/` | 2022-09-10 |
| `/blog/event/2022/09/03/pittsburgh-forge-vs-cincinnati-wolfhounds` | Pittsburgh Forge D1 Men vs Cincinnati Wolfhounds | `/blog/event/2022/09/03/:slug/` | 2022-09-03 |
| `/blog/event/2022/09/03/pittsburgh-forge-d2-men-vs-queen-city-rugby-club` | Pittsburgh Forge D2 Men vs Queen City Rugby Club | `/blog/event/2022/09/03/:slug/` | 2022-09-03 |
| `/blog/event/2022/08/27/chicago-lions-vs-pittsburgh-forge` | Chicago Lions vs Pittsburgh Forge D1 Men | `/blog/event/2022/08/27/:slug/` | 2022-08-27 |
| `/blog/event/2022/08/27/cleveland-iron-maidens-vs-pittsburgh-forge` | Cleveland Iron Maidens vs Pittsburgh Forge Women | `/blog/event/2022/08/27/:slug/` | 2022-08-27 |

### SportsPress teams (61)

Shape: `/blog/team/:slug/`. Two teams use a nested slug:
`/blog/team/harrisburg-rugby-club/harrisburg-rugby-club-men` and
`/blog/team/chicago-lions/chicago-lions-women-d1`.

| URL | Title | Shape |
| --- | --- | --- |
| `/blog/team/chicago-north-shore` | Chicago North Shore | `/blog/team/:slug/` |
| `/blog/team/columbus-coyotes` | Columbus Coyotes | `/blog/team/:slug/` |
| `/blog/team/pittsburgh-harlequins` | Pittsburgh Harlequins | `/blog/team/:slug/` |
| `/blog/team/grand-rapids-growlers` | Grand Rapids Growlers | `/blog/team/:slug/` |
| `/blog/team/metropolis-valkyries` | Metropolis Valkyries | `/blog/team/:slug/` |
| `/blog/team/st-louis-bombers` | St. Louis Bombers | `/blog/team/:slug/` |
| `/blog/team/ypsilanti-rugby-club` | Ypsilanti Rugby Club | `/blog/team/:slug/` |
| `/blog/team/south-buffalo-rugby` | South Buffalo Rugby | `/blog/team/:slug/` |
| `/blog/team/uticuse-rugby-club` | Uticuse Rugby Club | `/blog/team/:slug/` |
| `/blog/team/north-buffalo-ninjas` | North Buffalo Ninjas | `/blog/team/:slug/` |
| `/blog/team/rochester-renegades` | Rochester Renegades | `/blog/team/:slug/` |
| `/blog/team/utah-vipers` | Utah Vipers | `/blog/team/:slug/` |
| `/blog/team/tbd` | TBD | `/blog/team/:slug/` |
| `/blog/team/findlay-rfc` | Findlay RFC | `/blog/team/:slug/` |
| `/blog/team/canton-rugby` | Canton Rugby | `/blog/team/:slug/` |
| `/blog/team/westside-outcasts` | Westside Outcasts | `/blog/team/:slug/` |
| `/blog/team/columbus-castaways-d4` | Columbus Castaways D4 | `/blog/team/:slug/` |
| `/blog/team/dayton-area-rugby-club-women` | Dayton Area Rugby Club | `/blog/team/:slug/` |
| `/blog/team/dayton-area-rugby-club` | Dayton Area Rugby Club | `/blog/team/:slug/` |
| `/blog/team/columbus-in-rfc` | Columbus (IN) RFC | `/blog/team/:slug/` |
| `/blog/team/marysville-rfc` | Marysville RFC | `/blog/team/:slug/` |
| `/blog/team/greensburg-rfc` | Greensburg RFC | `/blog/team/:slug/` |
| `/blog/team/cleveland-rovers-rfc-d4` | Cleveland Rovers RFC D4 | `/blog/team/:slug/` |
| `/blog/team/cleveland-rovers-rfc-d3` | Cleveland Rovers RFC D3 | `/blog/team/:slug/` |
| `/blog/team/south-pittsburgh-hooligans-rfc-d4` | South Pittsburgh Hooligans RFC D4 | `/blog/team/:slug/` |
| `/blog/team/south-pittsburgh-hooligans-rfc-d3` | South Pittsburgh Hooligans RFC D3 | `/blog/team/:slug/` |
| `/blog/team/erie-rfc` | Erie RFC | `/blog/team/:slug/` |
| `/blog/team/presque-isle-rfc` | Presque Isle RFC | `/blog/team/:slug/` |
| `/blog/team/akron-rfc` | Akron RFC | `/blog/team/:slug/` |
| `/blog/team/columbus-rugby-club` | Columbus Rugby Club | `/blog/team/:slug/` |
| `/blog/team/queen-city-rugby-club` | Queen City Rugby Club | `/blog/team/:slug/` |
| `/blog/team/kent-state-womens-rugby-club` | Kent State Women's Rugby Club | `/blog/team/:slug/` |
| `/blog/team/cleveland-iron-maidens` | Cleveland Iron Maidens | `/blog/team/:slug/` |
| `/blog/team/harrisburg-rugby-club/harrisburg-rugby-club-men-women` | Harrisburg Rugby Club Women | `/blog/team/harrisburg-rugby-club/:slug/` |
| `/blog/team/harrisburg-rugby-club/harrisburg-rugby-club-men` | Harrisburg Rugby Club Men | `/blog/team/harrisburg-rugby-club/:slug/` |
| `/blog/team/harrisburg-rugby-club` | Harrisburg Rugby Club | `/blog/team/:slug/` |
| `/blog/team/detroit-tradesmen-d3` | Detroit Tradesmen D3 | `/blog/team/:slug/` |
| `/blog/team/detroit-tradesmen-d1` | Detroit Tradesmen D1 | `/blog/team/:slug/` |
| `/blog/team/cincinnati-wolfhounds` | Cincinnati Wolfhounds | `/blog/team/:slug/` |
| `/blog/team/chicago-lions/chicago-lions-women-d1` | Chicago Lions Women D1 | `/blog/team/chicago-lions/:slug/` |
| `/blog/team/chicago-lions/chicago-lions-men-d1` | Chicago Lions Men D1 | `/blog/team/chicago-lions/:slug/` |
| `/blog/team/detroit-rugby-football-club-men-d4` | Detroit Rugby Football Club - Men D4 | `/blog/team/:slug/` |
| `/blog/team/detroit-rugby-football-club-womens` | Detroit Rugby Football Club - Womens | `/blog/team/:slug/` |
| `/blog/team/cincinnati-kelts` | Cincinnati Kelts | `/blog/team/:slug/` |
| `/blog/team/cincinnati-kelts-womens-rugby` | Cincinnati Kelts Women's Rugby | `/blog/team/:slug/` |
| `/blog/team/columbus-womens-rugby` | Columbus Women's Rugby | `/blog/team/:slug/` |
| `/blog/team/chicago-rugby-club` | Chicago Griffins | `/blog/team/:slug/` |
| `/blog/team/pittsburgh-forge-d2-women` | Pittsburgh Forge D2 Women | `/blog/team/:slug/` |
| `/blog/team/ucwrfc` | University of Cincinnati WRFC | `/blog/team/:slug/` |
| `/blog/team/pittsburgh-forge-women-gold` | Pittsburgh Forge Women - Gold | `/blog/team/:slug/` |
| `/blog/team/buffalo-womens-rugby-club` | Buffalo Women's Rugby Club | `/blog/team/:slug/` |
| `/blog/team/pittsburgh-forge-d4-men` | Pittsburgh Forge D4 Men | `/blog/team/:slug/` |
| `/blog/team/pittsburgh-forge-d3-men` | Pittsburgh Forge D3 Men | `/blog/team/:slug/` |
| `/blog/team/pittsburgh-forge-d1-women` | Pittsburgh Forge D1 Women | `/blog/team/:slug/` |
| `/blog/team/pittsburgh-forge-d2-men` | Pittsburgh Forge D2 Men | `/blog/team/:slug/` |
| `/blog/team/indianapolis-impalas-d1` | Indianapolis Impalas D1 | `/blog/team/:slug/` |
| `/blog/team/indianapolis-impalas-d4` | Indianapolis Impalas D4 | `/blog/team/:slug/` |
| `/blog/team/indianapolis-impalas-d2` | Indianapolis Impalas D2 | `/blog/team/:slug/` |
| `/blog/team/pittsburgh-forge-d1-men` | Pittsburgh Forge D1 Men | `/blog/team/:slug/` |
| `/blog/team/cleveland-crusaders-d3` | Cleveland Crusaders D3 | `/blog/team/:slug/` |
| `/blog/team/cleveland-crusaders-d1` | Cleveland Crusaders D1 | `/blog/team/:slug/` |

### SportsPress players (3)

Shape: `/blog/player/:slug/`.

| URL | Title | Shape |
| --- | --- | --- |
| `/blog/player/billy-gordon` | Billy Gordon | `/blog/player/:slug/` |
| `/blog/player/kyle-franklin` | Kyle Franklin | `/blog/player/:slug/` |
| `/blog/player/andy-chapman` | Andy Chapman | `/blog/player/:slug/` |

### SportsPress staff (1)

Shape: `/blog/staff/:slug/`.

| URL | Title | Shape |
| --- | --- | --- |
| `/blog/staff/steve-walsh` | Steve Walsh | `/blog/staff/:slug/` |

### SportsPress venues (3)

Shape: `/blog/venue/:slug/`.

| URL | Title | Shape |
| --- | --- | --- |
| `/blog/venue/phillip-murray-field` |  | `/blog/venue/:slug/` |
| `/blog/venue/red-lobster-stadium` |  | `/blog/venue/:slug/` |
| `/blog/venue/round-rock-multipurpose-complex` |  | `/blog/venue/:slug/` |

### SportsPress leagues (14)

Shape: `/blog/league/:slug/`.

| URL | Title | Shape |
| --- | --- | --- |
| `/blog/league/midwest-playoffs-men-d1` |  | `/blog/league/:slug/` |
| `/blog/league/midwest-mens-d2` |  | `/blog/league/:slug/` |
| `/blog/league/midwest-mens-d3` |  | `/blog/league/:slug/` |
| `/blog/league/midwest-playoffs-men-d3` |  | `/blog/league/:slug/` |
| `/blog/league/midwest-mens-d4` |  | `/blog/league/:slug/` |
| `/blog/league/midwest-playoffs-men-d4` |  | `/blog/league/:slug/` |
| `/blog/league/midwest-premiership-men` |  | `/blog/league/:slug/` |
| `/blog/league/midwest-premiership-women` |  | `/blog/league/:slug/` |
| `/blog/league/midwest-womens-d1-d2-hybrid` |  | `/blog/league/:slug/` |
| `/blog/league/midwest-playoffs-women-d1` |  | `/blog/league/:slug/` |
| `/blog/league/midwest-womens-d2` |  | `/blog/league/:slug/` |
| `/blog/league/midwest-womens-d2-playoffs` |  | `/blog/league/:slug/` |
| `/blog/league/nationals-womens-d1` |  | `/blog/league/:slug/` |
| `/blog/league/womens-friendly` |  | `/blog/league/:slug/` |

### SportsPress seasons (5)

Shape: `/blog/season/:slug/`.

| URL | Title | Shape |
| --- | --- | --- |
| `/blog/season/2022-fall` |  | `/blog/season/:slug/` |
| `/blog/season/2023-fall` |  | `/blog/season/:slug/` |
| `/blog/season/2024-fall` |  | `/blog/season/:slug/` |
| `/blog/season/2024-spring` |  | `/blog/season/:slug/` |
| `/blog/season/2025-fall` |  | `/blog/season/:slug/` |

### SportsPress calendar posts (21)

Shape: `/blog/calendar/:slug/`. Distinct from the `/calendar/:slug/` archive URLs in the
sitemap.

| URL | Title | Shape |
| --- | --- | --- |
| `/blog/calendar/pittsburgh-forge-mens-rugby-schedule` | Pittsburgh Forge Men's Rugby Schedule | `/blog/calendar/:slug/` |
| `/blog/calendar/pittsburgh-forge-womens-rugby-schedule` | Pittsburgh Forge Women's Rugby Schedule | `/blog/calendar/:slug/` |
| `/blog/calendar/d4-mens-schedule-fall-2025` | D4 Men's Schedule - Fall 2025 | `/blog/calendar/:slug/` |
| `/blog/calendar/d3-mens-schedule-fall-2025` | D3 Men's Schedule - Fall 2025 | `/blog/calendar/:slug/` |
| `/blog/calendar/d2-womens-schedule-fall-2025` | D2 Women's Schedule - Fall 2025 | `/blog/calendar/:slug/` |
| `/blog/calendar/d1-mens-schedule-fall-2025` | D1 Men's Schedule - Fall 2025 | `/blog/calendar/:slug/` |
| `/blog/calendar/womens-schedule-fall-2025` | D1 Women's Schedule - Fall 2025 | `/blog/calendar/:slug/` |
| `/blog/calendar/d4-mens-schedule-fall-2024` | D4 Men's Schedule - Fall 2024 | `/blog/calendar/:slug/` |
| `/blog/calendar/d3-mens-schedule-fall-2024` | D3 Men's Schedule - Fall 2024 | `/blog/calendar/:slug/` |
| `/blog/calendar/d2-womens-schedule-fall-2024` | D2 Women's Schedule - Fall 2024 | `/blog/calendar/:slug/` |
| `/blog/calendar/womens-schedule-fall-2024` | D1 Women's Schedule - Fall 2024 | `/blog/calendar/:slug/` |
| `/blog/calendar/d1-mens-schedule-fall-2024` | D1 Men's Schedule - Fall 2024 | `/blog/calendar/:slug/` |
| `/blog/calendar/d3-mens-schedule-fall-2023` | D3 Men's Schedule - Fall 2023 | `/blog/calendar/:slug/` |
| `/blog/calendar/d4-mens-schedule-fall-2023` | D4 Men's Schedule - Fall 2023 | `/blog/calendar/:slug/` |
| `/blog/calendar/womens-schedule-fall-2023` | Women's Schedule - Fall 2023 | `/blog/calendar/:slug/` |
| `/blog/calendar/d1-mens-schedule-fall-2023` | D1 Men's Schedule - Fall 2023 | `/blog/calendar/:slug/` |
| `/blog/calendar/d3-mens-schedule-fall-2022` | D3 Men's Schedule - Fall 2022 | `/blog/calendar/:slug/` |
| `/blog/calendar/d2-mens-schedule-fall-2022` | D2 Men's Schedule - Fall 2022 | `/blog/calendar/:slug/` |
| `/blog/calendar/d1-mens-schedule-fall-2022` | D1 Men's Schedule - Fall 2022 | `/blog/calendar/:slug/` |
| `/blog/calendar/womens-schedule-fall-2022` | Women's Schedule - Fall 2022 | `/blog/calendar/:slug/` |
| `/blog/calendar/calendar` | Pittsburgh Forge Rugby Club Match Calendar | `/blog/calendar/:slug/` |

### Store & system URLs

| URL | Status | Notes |
| --- | --- | --- |
| `/shop` | 200 | WooCommerce shop archive; paginated at `/shop/page/N/` |
| `/cart` | 200 | WooCommerce cart |
| `/checkout` | 302 → `/cart` | Empty cart redirects |
| `/wp-login.php` | 200 | WordPress login |
| `/feed` | 200 | Site RSS |
| `/comments/feed` | 200 | Comments RSS |
| `/?s=:query` | 200 | Search results |
| `/blog/page/N/` | 200 | Blog pagination |
| `/wp-json/` | 200 | REST API index |
| `/my-account` | 404 | WooCommerce page exists but is `private` |
| `/wp-content/uploads/...` | 200 | 320 media files; attachment pages 301-redirect here |

## Caveats

- **Cloudflare caching:** REST responses carry `Cache-Control: max-age=172800` (~2 days).
  Counts can lag up to ~2 days; append a cache-buster if freshness matters.
- **Draft/private pages excluded:** 5 pages are not public (2 draft, 3 private) and are
  intentionally absent from the sitemap and this inventory.
- **Media attachment pages** are not HTML content pages — they 301-redirect to the raw
  upload file, so they are listed as a redirect class rather than enumerated individually.
- **Calendar URL duality:** `/calendar/:slug/` (10 archive pages, in sitemap) and
  `/blog/calendar/:slug/` (21 SportsPress calendar posts, not in sitemap) are different sets.
- **SportsPress core routes:** `wp/v2/events` and `wp/v2/tables` 404; use
  `sportspress/v2` (see `docs/agents/sportspress-access.md`).

## Reproduction

```sh
# Sitemaps
curl -sS https://pghrugby.com/sitemap.xml
for s in sitemap-misc page-sitemap post-sitemap sp_table-sitemap \
         calendar-sitemap productcat-sitemap producttags-sitemap; do
  curl -sS "https://pghrugby.com/$s.xml"
done

# WooCommerce (app password from .env.local)
curl -sS -u "$WORDPRESS_APP_USERNAME:$WORDPRESS_APP_PASSWORD" \
  "https://pghrugby.com/wp-json/wc/v3/products?per_page=100&status=any"

# SportsPress (unauthenticated)
curl -sS "https://pghrugby.com/wp-json/sportspress/v2/events?per_page=100"
curl -sS "https://pghrugby.com/wp-json/sportspress/v2/tables?per_page=100"
```
