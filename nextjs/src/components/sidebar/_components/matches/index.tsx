import Heading from "@components/typography/heading"
import Match from "./match"
import sidebarStyles from "../../sidebar.module.css"
import s from "./styles.module.css"

export default function MatchBlock() {
  return (
    <div className={sidebarStyles.widget}>
      <Heading level="h3" className={sidebarStyles.sidebarHeader}>
        Upcoming Matches
      </Heading>

      <div className={s.matchesWrapper}>
        <Match
          league="Men's"
          division="D1"
          seasonYear={2025}
          seasonName="Fall"
        />

        <Match
          league="Women's"
          division="D1"
          seasonYear={2025}
          seasonName="Fall"
        />
      </div>
    </div>
  )
}
