import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import Section from "@components/showcase/section"
import contentStyles from "@styles/content.module.css"

import { getDemo } from "../_demos"
import s from "../style.module.css"

// Dev-only, like the hub: kept out of the production prerender pass and 404d at
// runtime in production.
export const dynamic = "force-dynamic"

type WorkbenchDemoPageProps = {
  params: Promise<{ demo: string }>
}

/**
 * Metadata for a demo page, derived from its registry entry.
 */
export async function generateMetadata({
  params,
}: WorkbenchDemoPageProps): Promise<Metadata> {
  const { demo } = await params
  const entry = getDemo(demo)

  return {
    title: entry
      ? `${entry.title} · Workbench | Pittsburgh Forge Rugby Club`
      : "Workbench | Pittsburgh Forge Rugby Club",
    robots: { index: false, follow: false },
  }
}

/**
 * `/workbench/[demo]` — one component's demo, rendered from its registry entry.
 * An unknown id 404s.
 *
 * @returns The demo section, or a 404 in production or for an unknown id.
 */
export default async function WorkbenchDemoPage({
  params,
}: WorkbenchDemoPageProps) {
  if (process.env.NODE_ENV === "production") {
    notFound()
  }

  const { demo } = await params
  const entry = getDemo(demo)
  if (!entry) {
    notFound()
  }

  return (
    <div className={`${contentStyles.contentBlock} ${s.workbench}`}>
      <nav className={s.breadcrumb} aria-label="Breadcrumb">
        <Link href="/workbench" className={s.breadcrumbLink}>
          ← Workbench
        </Link>
      </nav>

      <Section title={entry.title} description={entry.description}>
        {entry.render()}
      </Section>
    </div>
  )
}
