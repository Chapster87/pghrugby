import Image from "next/image"
import Link from "next/link"

import { urlBuilder } from "@/content/formatters/url"
import type { ForgeCmsMatch } from "@/lib/forgecms/competition.query"
import Crest from "@svg/Crest"

import { MatchTicker } from "./match-ticker"
import { NewsImage } from "./news-image"
import { demoUpcoming } from "./demo-fixtures"
import s from "./style.module.css"

/** The article fields the homepage sections read. */
export type HomepageArticle = {
  title: string | null
  slug: string | null
  featuredImage?: unknown
  wpexcerpt?: string | null
  creationDate?: string | null
  _updatedAt?: string | null
}

/**
 * Format a date string for display on the homepage.
 * @param value - An ISO date string, or null.
 * @returns A short human date, or an empty string.
 */
function formatDate(value?: string | null): string {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

/**
 * Whether a team name refers to the Forge.
 * @param name - A team name from ForgeCMS.
 * @returns True when the name contains "forge".
 */
function isForge(name?: string | null): boolean {
  return !!name && name.toLowerCase().includes("forge")
}

/**
 * Read an image URL and dimensions from a DatoCMS featured-image field.
 * @param featured - The raw `featuredImage` value.
 * @returns The image URL and dimensions, or null when there is no usable image.
 */
function readFeaturedImage(featured: unknown): {
  url: string
  width: number
  height: number
} | null {
  if (typeof featured !== "object" || featured === null) return null
  const record = featured as {
    secure_url?: unknown
    url?: unknown
    width?: unknown
    height?: unknown
  }
  const url =
    typeof record.secure_url === "string"
      ? record.secure_url
      : typeof record.url === "string"
      ? record.url
      : null
  if (!url) return null
  return {
    url,
    width: typeof record.width === "number" ? record.width : 800,
    height: typeof record.height === "number" ? record.height : 500,
  }
}

/**
 * Select the most recent completed matches.
 * @param matches - All ForgeCMS matches.
 * @returns The last ten completed matches, newest first.
 */
function selectMatches(matches: ForgeCmsMatch[]): {
  recent: ForgeCmsMatch[]
} {
  const now = Date.now()
  const recent = matches
    .filter(
      (match) =>
        new Date(match.match_date_time).getTime() < now &&
        (match.home_team_score != null || match.away_team_score != null)
    )
    .sort(
      (a, b) =>
        new Date(b.match_date_time).getTime() -
        new Date(a.match_date_time).getTime()
    )
    .slice(0, 10)
  return { recent }
}

/**
 * Group matches by their calendar day for the results board.
 * @param matches - Matches already sorted newest first.
 * @returns One group per day, in the order the matches arrived.
 */
function groupByDate(
  matches: ForgeCmsMatch[]
): { label: string; matches: ForgeCmsMatch[] }[] {
  const groups = new Map<string, ForgeCmsMatch[]>()

  for (const match of matches) {
    const label = new Date(match.match_date_time).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
    const list = groups.get(label) ?? []
    list.push(match)
    groups.set(label, list)
  }

  return Array.from(groups, ([label, groupMatches]) => ({
    label,
    matches: groupMatches,
  }))
}

/**
 * The static homepage content: the Forged in Pittsburgh hero, matchday ticker,
 * Forward With Honor, recent results, latest news, and the join band. Shared by
 * `/new-home` and the live homepage until the CMS wiring lands.
 * @param props.articles - The latest DatoCMS articles.
 * @param props.matches - All ForgeCMS matches.
 * @returns The full static content stack.
 */
export function NewHomeContent({
  articles,
  matches,
}: {
  articles: HomepageArticle[]
  matches: ForgeCmsMatch[]
}) {
  const { recent } = selectMatches(matches)

  const news = articles.slice(0, 4).map((item) => ({
    title: item.title ?? "",
    slug: item.slug,
    date: item.creationDate ?? item._updatedAt,
    excerpt: item.wpexcerpt ?? "",
    image: readFeaturedImage(item.featuredImage),
  }))

  const resultGroups = groupByDate(recent).slice(0, 3)

  return (
    <>
      <section className={s.hero}>
        <video className={s.heroVideo} autoPlay loop muted playsInline>
          <source
            src="https://cdn.sanity.io/files/ax8uvxtm/production/f7e8d7d7f4cf3916760769b20730a05e607290a7.webm"
            type="video/webm"
          />
          <source
            src="https://cdn.sanity.io/files/ax8uvxtm/production/4fdeaa51734cca1184a50bef041c918e2bf8bac7.mp4"
            type="video/mp4"
          />
        </video>
        <div className={s.heroOverlay} aria-hidden />
        <div className={s.heroInner}>
          <div className={s.heroCopy}>
            <h1 className={s.heroTitle}>
              Forged in
              <br />
              <span className={s.gold}>Pittsburgh.</span>
            </h1>
            <p className={s.heroLede}>
              A historic Pittsburgh rugby club with three men&apos;s teams and
              two women&apos;s teams — competing, developing, and building the
              game.
            </p>
            <div className={s.heroActions}>
              <Link
                href="/contact"
                className={s.primaryButton}
                data-testid="hero-join"
              >
                Join the team
              </Link>
              <Link href="/mens-schedule" className={s.secondaryButton}>
                See fixtures
              </Link>
            </div>
            <div className={s.heroMeta}>
              <span>Women&apos;s - D1, D2</span>
              <span className={s.dot} aria-hidden />
              <span>Men&apos;s - D1, D3, D4</span>
              <span className={s.dot} aria-hidden />
              <span>Pittsburgh, PA</span>
            </div>
          </div>
        </div>
      </section>

      <MatchTicker matches={demoUpcoming} />

      <section className={`${s.section} ${s.sides}`}>
        <div className={s.sectionInner}>
          <div className={s.sectionHead}>
            <h2 className={s.sectionTitle}>Forward With Honor.</h2>
            <div className={s.sectionLede}>
              <p>Welcome to the Pittsburgh Forge Rugby Club.</p>
              <p>
                Proudly rooted in Pittsburgh since 1964, the Forge is one of the
                largest and most dynamic rugby clubs in the Midwest. We field
                three competitive men&apos;s teams and two outstanding
                women&apos;s teams — five divisions across Men&apos;s D1, D3,
                and D4 and Women&apos;s D1 and D2.
              </p>
              <p>
                Our teams compete in Midwest Division 1 with regular playoff
                appearances and national recognition, including a current #4
                national ranking for our Women&apos;s side. Guided by
                world-class coaching, we offer established pathways for players
                to develop and gain exposure at higher representative levels,
                including opportunities with professional squads.
              </p>
              <p>
                Whether you&apos;re a seasoned player or brand new to the sport,
                there&apos;s a place for you here. As a 501(c)(3) non-profit, we
                also support youth programming through the South Hills Youth
                Rugby program, with future expansion of our senior and youth
                competitions ahead.
              </p>
            </div>
          </div>
          <div className={s.sideGrid}>
            <article className={s.sideCard}>
              <Link href="/mens-team" className={s.teamLink}>
                <h3 className={s.sideTitle}>Men&apos;s Team</h3>
              </Link>
              <p className={s.sideCopy}>
                Competitive rugby across the men&apos;s divisions.
              </p>
              <div className={s.sideLinks}>
                <Link href="/mens-schedule">Schedule</Link>
                <Link href="/mens-standings">Standings</Link>
              </div>
            </article>
            <article className={s.sideCard}>
              <Link href="/mens-team" className={s.teamLink}>
                <h3 className={s.sideTitle}>Women&apos;s Team</h3>
              </Link>
              <p className={s.sideCopy}>
                Competitive rugby across the women&apos;s divisions.
              </p>
              <div className={s.sideLinks}>
                <Link href="/womens-schedule">Schedule</Link>
                <Link href="/womens-standings">Standings</Link>
              </div>
            </article>
          </div>
          <div className={s.sectionBottom}>
            <p>
              PFRC is a 501c3 non-profit organization dedicated to fostering
              participation in Rugby Union in and around the City of Pittsburgh.
              Currently, we compete in five divisions; Men’s Division 1, 3, and
              4 and Women’s Division 1 &amp; 2. We also offer youth programming
              through the{" "}
              <Link
                href="https://www.facebook.com/southhillsyouthrugby"
                target="_blank"
              >
                South Hills Youth Rugby
              </Link>{" "}
              program!
            </p>
            <p>
              Stay posted for future expansion of our senior &amp; youth
              competitions.
            </p>
          </div>
          <div className={s.newsletter}>
            <div className={s.newsletterCopy}>
              <h3 className={s.newsletterTitle}>Stay close to the Forge</h3>
              <p className={s.newsletterText}>
                Join our newsletter for club updates, competition results, and
                upcoming events.
              </p>
            </div>
            <a
              href="https://pghrugby.us10.list-manage.com/subscribe?u=00d6da5b4f0c90d626366c7e8&id=45a42c9944"
              target="_blank"
              rel="noopener noreferrer"
              className={s.newsletterButton}
            >
              Subscribe
            </a>
          </div>
        </div>
      </section>

      <section className={`${s.section} ${s.results}`}>
        <div className={s.sectionInner}>
          <div className={s.sectionHead}>
            <h2 className={s.sectionTitle}>Recent results</h2>
          </div>
          {resultGroups.length > 0 ? (
            <div className={s.resultGroups}>
              {resultGroups.map((group) => (
                <div key={group.label} className={s.resultGroup}>
                  <h3 className={s.resultGroupDate}>{group.label}</h3>
                  <ul className={s.resultList}>
                    {group.matches.map((match) => {
                      const forgeHome = isForge(match.home_team?.team_name)
                      const forgeScore = forgeHome
                        ? match.home_team_score
                        : match.away_team_score
                      const opponentScore = forgeHome
                        ? match.away_team_score
                        : match.home_team_score
                      const result =
                        (forgeScore ?? 0) > (opponentScore ?? 0)
                          ? "W"
                          : (forgeScore ?? 0) < (opponentScore ?? 0)
                          ? "L"
                          : "D"
                      const opponent = forgeHome
                        ? match.away_team?.team_name
                        : match.home_team?.team_name
                      return (
                        <li key={match.id} className={s.resultRow}>
                          <span className={s.resultSide}>
                            {match.league?.short_name}{" "}
                            {match.division?.short_name}
                          </span>
                          <span className={s.resultOpponent}>
                            {forgeHome ? "vs" : "at"} {opponent ?? "TBD"}
                          </span>
                          <span className={s.resultScore}>
                            {forgeScore ?? 0}–{opponentScore ?? 0}
                          </span>
                          <span
                            className={`${s.resultBadge} ${
                              result === "W"
                                ? s.resultW
                                : result === "L"
                                ? s.resultL
                                : s.resultD
                            }`}
                          >
                            {result}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className={s.empty}>
              Results will appear here once the season is underway.
            </p>
          )}
        </div>
      </section>

      <section className={`${s.section} ${s.news}`}>
        <div className={s.sectionInner}>
          <div className={s.sectionHead}>
            <h2 className={s.sectionTitle}>Latest news</h2>
          </div>
          {news.length > 0 ? (
            <div className={s.newsGrid}>
              {news.map((item) => (
                <article key={item.slug} className={s.newsCard}>
                  <Link
                    href={urlBuilder("post", item.slug ?? undefined)}
                    className={s.newsImageLink}
                    tabIndex={-1}
                    aria-hidden
                  >
                    {item.image ? (
                      <NewsImage
                        src={item.image.url}
                        alt=""
                        width={item.image.width}
                        height={item.image.height}
                      />
                    ) : (
                      <div className={s.newsImageFallback}>
                        <Crest className={s.newsFallbackCrest} />
                      </div>
                    )}
                  </Link>
                  <div className={s.newsBody}>
                    <span className={s.newsDate}>{formatDate(item.date)}</span>
                    <h3 className={s.newsTitle}>
                      <Link href={urlBuilder("post", item.slug ?? undefined)}>
                        {item.title}
                      </Link>
                    </h3>
                    {item.excerpt ? (
                      <p className={s.newsExcerpt}>{item.excerpt}</p>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className={s.empty}>News and match reports will appear here.</p>
          )}
        </div>
      </section>

      <section className={s.joinBand}>
        <div className={s.joinInner}>
          <Image
            src="https://res.cloudinary.com/dvwhsjqsl/image/upload/v1795576607/Forge-Logo-black_essw3b.png"
            alt="Pittsburgh Forge Rugby Club"
            width={180}
            height={180}
            unoptimized
            className={s.joinLogo}
          />
          <div className={s.joinText}>
            <h2 className={s.joinTitle}>Pull on the jersey.</h2>
            <p className={s.joinCopy}>
              Join a club with a legacy in Pittsburgh and a place for every
              player.
            </p>
          </div>
          <Link href="/contact" className={s.joinButton}>
            Contact Us
          </Link>
        </div>
      </section>
    </>
  )
}
