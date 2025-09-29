import type { Metadata, ResolvingMetadata } from "next"
import Link from "@components/link"
import Heading from "@components/typography/heading"
import contentStyles from "@/styles/content.module.css"
import s from "./styles.module.css"

import { client } from "@/sanity/lib/client"

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

// Fetch Linktree data from Sanity
async function getLinktreeData() {
  return client.fetch(
    `*[_type == "linktree"]{
      primaryGroupTitle,
      primaryLinks[]{
        label,
        "url": coalesce(route, customLink, internalLink->slug.current),
        openInNewTab
      },
      secondaryGroupTitle,
      secondaryLinks[]{
        label,
        "url": coalesce(route, customLink, internalLink->slug.current),
        openInNewTab
      }
    }[0]`
  )
}

export default async function LinksPage() {
  const linktreeData = await getLinktreeData()

  return (
    <div className={`${contentStyles.contentMain} ${s.linktreeMain}`}>
      {/* <h1 className={s.linktreeTitle}>Pittsburgh Rugby Links</h1> */}
      <ul className={s.linkList}>
        {linktreeData && (
          <>
            <li className={s.linktreeLinkGroup}>
              <Heading className={s.linktreeGroupTitle} level="h2">
                {linktreeData.primaryGroupTitle}:
              </Heading>
              <ul className={s.linktreeLinksList}>
                {linktreeData.primaryLinks.map((link: any) => (
                  <li key={link.url} className={s.linktreeLinkItem}>
                    <Link
                      href={link.url}
                      className={s.linktreeLink}
                      target={link.openInNewTab ? "_blank" : "_self"}
                      buttonStyle
                      variant="primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
            <li className={s.linktreeLinkGroup}>
              <Heading className={s.linktreeGroupTitle} level="h2">
                {linktreeData.secondaryGroupTitle}:
              </Heading>
              <ul className={s.linktreeLinksList}>
                {linktreeData.secondaryLinks.map((link: any) => (
                  <li key={link.url} className={s.linktreeLinkItem}>
                    <Link
                      href={link.url}
                      className={s.linktreeLink}
                      target={link.openInNewTab ? "_blank" : "_self"}
                      buttonStyle
                      variant="primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          </>
        )}
      </ul>
    </div>
  )
}
