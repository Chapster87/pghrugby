import type { Metadata, ResolvingMetadata } from "next"
import Link from "next/link"
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
      <h1>Links</h1>
      <ul className={s.linkList}>
        {linktreeData && (
          <>
            <li>
              <span className={s.linktreeGroupTitle}>
                {linktreeData.primaryGroupTitle}
              </span>
              <ul className={s.linktreeLinksList}>
                {linktreeData.primaryLinks.map((link: any) => (
                  <li key={link.url}>
                    <Link
                      href={link.url}
                      target={link.openInNewTab ? "_blank" : "_self"}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
            <li>
              <span className={s.linktreeGroupTitle}>
                {linktreeData.secondaryGroupTitle}
              </span>
              <ul className={s.linktreeLinksList}>
                {linktreeData.secondaryLinks.map((link: any) => (
                  <li key={link.url}>
                    <Link
                      href={link.url}
                      target={link.openInNewTab ? "_blank" : "_self"}
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
