import type { Metadata, ResolvingMetadata } from "next"

import Section from "@components/showcase/section"
import Heading from "@components/typography/heading"
import Text from "@components/typography/text"
import contentStyles from "@styles/content.module.css"

import { sections } from "./_sections"
import s from "./style.module.css"

/**
 * Generate metadata for the page.
 */
export async function generateMetadata(
  parent: ResolvingMetadata
): Promise<Metadata> {
  // Build canonical URL using current URL and slug
  const url = new URL((await parent).metadataBase || "https://pghrugby.com")
  url.pathname = `/styleguide`

  return {
    title: "Style Guide | Pittsburgh Forge Rugby Club",
    description:
      "The Pittsburgh Forge Rugby Club design brief: colors, logos, and typography that keep our brand consistent.",
    alternates: {
      canonical: url.toString(),
    },
    openGraph: {
      url: url.toString(),
    },
  } satisfies Metadata
}

/**
 * `/styleguide` — the public design brief. Renders every section from the
 * registry in `./_sections`, all on one landing page.
 *
 * @returns The styleguide landing page.
 */
export default function StyleGuidePage() {
  return (
    <div className={`${contentStyles.contentBlock} ${s.styleguide}`}>
      <header className={s.intro}>
        <Heading level="h1">Style Guide</Heading>
        <Text className={s.introText}>
          The design brief for Pittsburgh Forge Rugby Club: the colors, logos,
          and typography that keep our brand consistent across the site.
        </Text>
      </header>

      <nav className={s.index} aria-label="Section index">
        {sections.map((section) => (
          <a key={section.id} className={s.indexLink} href={`#${section.id}`}>
            {section.title}
          </a>
        ))}
      </nav>

      <div className={s.sections}>
        {sections.map((section) => (
          <Section
            key={section.id}
            id={section.id}
            title={section.title}
            description={section.description}
          >
            {section.render()}
          </Section>
        ))}
      </div>
    </div>
  )
}
