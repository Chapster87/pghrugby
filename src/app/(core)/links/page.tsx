import type { Metadata, ResolvingMetadata } from "next"
import Link from "@components/link"
import Heading from "@components/typography/heading"
import contentStyles from "@/styles/content.module.css"
import {
  resolveLinkTarget,
  type ForgeCmsNavNode,
} from "@/lib/forgecms/chrome.query"
import { linksQuery } from "./links.query"
import { executeQuery } from "@/lib/forgecms/execute-query"
import { isForgeCmsPreviewEnabled } from "@/lib/cms-preview"
import s from "./styles.module.css"

/**
 * Generate metadata for the page.
 */
export async function generateMetadata(
  props: { params: Promise<{ slug: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  // Build canonical URL using current URL and slug
  const url = new URL((await parent).metadataBase || "https://pghrugby.com")
  url.pathname = `/links`

  return {
    title: "Links | Pittsburgh Forge Rugby Club",
    description:
      "Explore all the important links related to the Pittsburgh Forge Rugby Club, including social media, events, and more.",
    alternates: {
      canonical: url.toString(),
    },
    openGraph: {
      url: url.toString(),
    },
  } satisfies Metadata
}

/**
 * One labelled group of linktree links.
 *
 * A node with nowhere to go — a `group` parent, whose children this page does
 * not render — is skipped rather than given a missing `href`, and a group left
 * with nothing drops out instead of rendering an empty heading.
 */
function LinkGroup({
  heading,
  links,
}: {
  heading: string
  links?: ForgeCmsNavNode[] | null
}) {
  const resolved = (links ?? []).flatMap((link) => {
    const target = resolveLinkTarget(link)
    return target ? [{ link, target }] : []
  })

  if (resolved.length === 0) return null

  return (
    <li className={s.linktreeLinkGroup}>
      <Heading className={s.linktreeGroupTitle} level="h2">
        {heading}
      </Heading>
      <ul className={s.linktreeLinksList}>
        {resolved.map(({ link, target }) => (
          <li key={link.id ?? target.href} className={s.linktreeLinkItem}>
            <Link
              href={target.href}
              className={s.linktreeLink}
              openInNewTab={target.openInNewTab}
              buttonStyle
              variant="primary"
            >
              {link.labelOverride}
            </Link>
          </li>
        ))}
      </ul>
    </li>
  )
}

export default async function LinksPage() {
  // Draft viewing is a local affordance: the switch is false on every deploy, so
  // this is a published read in production (see `@/lib/cms-preview`).
  const preview = isForgeCmsPreviewEnabled()

  const { linktree: linkTreeData } = await executeQuery(linksQuery, {
    preview,
    variables: { preview },
  })

  return (
    <div className={`${contentStyles.contentBlock} ${s.linktreeMain}`}>
      <h1 className={s.linktreeTitle}>Pittsburgh Rugby Links</h1>
      <ul className={s.linkList}>
        <LinkGroup heading="Top Links:" links={linkTreeData?.top_links} />
        <LinkGroup heading="Club Info:" links={linkTreeData?.club_info} />
      </ul>
    </div>
  )
}
