import type { Metadata, ResolvingMetadata } from "next"
import Heading from "@components/typography/heading"
import contentStyles from "@/styles/content.module.css"
import StandingsTable from "@/components/competition/standingsTable"
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
    title: "Women's Rugby Season Standings | Pittsburgh Forge Rugby Club",
    description:
      "Stay up-to-date with the latest women's rugby season standings for the Pittsburgh Forge Rugby Club.",
    alternates: {
      canonical: url.toString(),
    },
    openGraph: {
      url: url.toString(),
    },
  } satisfies Metadata
}

export default function WomensStandings() {
  return (
    <div className={`${contentStyles.contentMain} ${s.mensStandingsMain}`}>
      <Heading level="h1">Men's Rugby Season Standings</Heading>

      <StandingsTable
        league="Women's"
        division="D1"
        seasonYear={2025}
        seasonName="Fall"
      />
      <StandingsTable
        league="Women's"
        division="D2"
        seasonYear={2025}
        seasonName="Fall"
      />
    </div>
  )
}
