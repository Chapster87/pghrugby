import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import Heading from "@components/typography/heading"
import Text from "@components/typography/text"
import contentStyles from "@styles/content.module.css"

import { demos } from "./_demos"
import s from "./style.module.css"

// The workbench is a development tool, never a customer-facing page.
// `force-dynamic` keeps it out of the production prerender pass; the runtime
// guard below 404s it in production so it cannot be served on the public site.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Workbench | Pittsburgh Forge Rugby Club",
  robots: { index: false, follow: false },
}

/**
 * `/workbench` — the hub for the dev-only component demos. Lists each registered
 * demo as a link to its child page; the demos themselves live under `./_demos`.
 *
 * @returns The workbench hub, or a 404 once built for production.
 */
export default function WorkbenchPage() {
  if (process.env.NODE_ENV === "production") {
    notFound()
  }

  return (
    <div className={`${contentStyles.contentBlock} ${s.workbench}`}>
      <header className={s.intro}>
        <Heading level="h1">Workbench</Heading>
        <Text className={s.introText}>
          A development-only hub for exercising our shared UI components. Each
          component has its own demo page; register a new demo and it appears
          here.
        </Text>
      </header>

      <nav className={s.grid} aria-label="Component demos">
        {demos.map((demo) => (
          <Link key={demo.id} href={`/workbench/${demo.id}`} className={s.card}>
            <span className={s.cardTitle}>{demo.title}</span>
            {demo.description && (
              <span className={s.cardDescription}>{demo.description}</span>
            )}
          </Link>
        ))}
      </nav>

      <footer className={s.footer}>
        <Text>
          For the design brief, see the{" "}
          <Link href="/styleguide" className={s.inlineLink}>
            styleguide
          </Link>
          .
        </Text>
      </footer>
    </div>
  )
}
