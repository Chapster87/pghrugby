import { FixtureCountdown } from "./fixture-countdown"
import type { DemoMatch } from "./demo-fixtures"
import s from "./style.module.css"

/**
 * Format a fixture date as a short weekday label.
 * @param value - The ISO date-time.
 * @returns A label such as "Sat, Dec 5".
 */
function formatDay(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

/**
 * The opponent for a match, from the Forge's point of view.
 * @param match - The demo match.
 * @returns The opposing team's name.
 */
function opponent(match: DemoMatch): string {
  return match.venue === "Home" ? match.away : match.home
}

/**
 * A full-width ticker of upcoming match cards, with a live countdown on each.
 * @param props.matches - The upcoming matches to show.
 * @returns The ticker section.
 */
export function MatchTicker({ matches }: { matches: DemoMatch[] }) {
  return (
    <section className={s.ticker} aria-label="Upcoming matches">
      <div className={s.tickerInner}>
        {matches.map((match) => (
          <article key={match.id} className={s.tickerCard}>
            <span className={s.tickerSide}>{match.side}</span>
            <span className={s.tickerOpp}>
              {match.venue === "Home" ? "vs" : "at"} {opponent(match)}
            </span>
            <span className={s.tickerDay}>{formatDay(match.dateTime)}</span>
            <FixtureCountdown dateTime={match.dateTime} size="sm" />
          </article>
        ))}
        <span className={s.tickerNote}>Demo fixtures</span>
      </div>
    </section>
  )
}
