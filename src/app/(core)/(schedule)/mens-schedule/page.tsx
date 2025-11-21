import type { Metadata, ResolvingMetadata } from "next"
import Heading from "@components/typography/heading"
import contentStyles from "@/styles/content.module.css"
import ScheduleTable from "@/components/competition/scheduleTable"
import s from "./styles.module.css"

/**
 * Generate metadata for the page.
 */
export async function generateMetadata(
  props: { params: { slug: string } },
  parent: ResolvingMetadata
): Promise<Metadata> {
  // Build canonical URL using current URL and slug
  const url = new URL((await parent).metadataBase || "https://pghrugby.com")
  url.pathname = `/links`

  return {
    title: "Men's Rugby Season Schedules | Pittsburgh Forge Rugby Club",
    description:
      "Stay up-to-date with the latest men's rugby season schedules for the Pittsburgh Forge Rugby Club.",
    alternates: {
      canonical: url.toString(),
    },
    openGraph: {
      url: url.toString(),
    },
  } satisfies Metadata
}

export default function MensSchedule() {
  return (
    <div className={`${contentStyles.contentMain} ${s.mensScheduleMain}`}>
      <Heading level="h1">Men's Rugby Season Schedules</Heading>

      <ScheduleTable
        league="Men's"
        division="D1"
        seasonYear={2025}
        seasonName="Fall"
      />
      <ScheduleTable
        league="Men's"
        division="D3"
        seasonYear={2025}
        seasonName="Fall"
      />
      <ScheduleTable
        league="Men's"
        division="D4"
        seasonYear={2025}
        seasonName="Fall"
      />
    </div>
  )
}
