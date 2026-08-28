import type { Metadata, ResolvingMetadata } from "next"
import Link from "@components/link"
import Heading from "@components/typography/heading"
import contentStyles from "@/styles/content.module.css"
import { linksQuery } from "./links.query"
import { executeQuery } from "@/lib/forgecms/execute-query"
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

export default async function LinksPage() {
  const { linktree: linkTreeData } = await executeQuery(linksQuery)

  console.log("Links Data:", linkTreeData)

  return (
    <div className={`${contentStyles.contentBlock} ${s.linktreeMain}`}>
      <h1 className={s.linktreeTitle}>Pittsburgh Rugby Links</h1>
      <ul className={s.linkList}>
        {linkTreeData?.top_links && (
          <li className={s.linktreeLinkGroup}>
            <Heading className={s.linktreeGroupTitle} level="h2">
              Top Links:
            </Heading>
            <ul className={s.linktreeLinksList}>
              {linkTreeData.top_links.map((link: any) => (
                <li key={link.routePath} className={s.linktreeLinkItem}>
                  <Link
                    href={link.routePath}
                    className={s.linktreeLink}
                    // target={link.openInNewTab ? "_blank" : "_self"}
                    buttonStyle
                    variant="primary"
                  >
                    {link.labelOverride}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        )}
        {linkTreeData?.club_info && (
          <li className={s.linktreeLinkGroup}>
            <Heading className={s.linktreeGroupTitle} level="h2">
              Club Info:
            </Heading>
            <ul className={s.linktreeLinksList}>
              {linkTreeData.club_info.map((link: any) => (
                <li key={link.routePath} className={s.linktreeLinkItem}>
                  <Link
                    href={link.routePath}
                    className={s.linktreeLink}
                    // target={link.openInNewTab ? "_blank" : "_self"}
                    buttonStyle
                    variant="primary"
                  >
                    {link.labelOverride}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        )}
      </ul>
    </div>
  )
}
