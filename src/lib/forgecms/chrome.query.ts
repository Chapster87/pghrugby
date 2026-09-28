// ForgeCMS site-chrome queries (nav, settings, socials, sponsors).
// Replaces the Sanity `navigation` / `settings` / `socialMedia` / `sponsor` /
// `sponsorBar` document types. Note the snake_case `site_navigation` entry
// point — the one chrome model queried by snake_case rather than camelCase.

// ---------------------------------------------------------------------------
// Site navigation (header + footer)
// ---------------------------------------------------------------------------

export const siteNavigationQuery = `
  query siteNavigationQuery {
    site_navigation {
      id
      header
      footer
    }
  }
`

// ForgeCMS stores nav nodes as free-form JSON in the linktree shape: a node is a
// "group" (renders a label + children), a "static" (renders a link to
// routePath), or an "external" (renders a link to url, usually in a new tab).
// All three may carry a labelOverride.
export interface ForgeCmsNavNode {
  id: string
  type: "group" | "static" | "external"
  labelOverride?: string | null
  routePath?: string | null
  url?: string | null
  children?: ForgeCmsNavNode[] | null
}

// The shape the header/footer components consume (matches the app's NavItem /
// SubMenuItem interfaces — label, url, route, openInNewTab, submenu).
export interface MappedNavLink {
  label: string
  url: string
  route?: string
  openInNewTab: boolean
}

export interface MappedNavItem extends MappedNavLink {
  submenu: MappedNavLink[]
}

/**
 * Where a nav or linktree node points.
 *
 * A `static` node carries `routePath` (an in-site route); an `external` node
 * carries `url` instead. Reading only one of the two is the trap: a page that
 * assumes `routePath` renders `href={undefined}`, which `next/link` rejects, the
 * first time an editor adds an external link — a data change, not a code change.
 *
 * @param node - A node from `site_navigation` or `linktree`.
 * @returns The href and whether it leaves the site, or null when the node points
 *   nowhere (a `group` parent, which is a label for its children).
 */
export function resolveLinkTarget(
  node: ForgeCmsNavNode
): { href: string; openInNewTab: boolean } | null {
  const route = node.routePath?.trim()
  if (route) return { href: route, openInNewTab: false }

  const url = node.url?.trim()
  if (url) return { href: url, openInNewTab: true }

  return null
}

/**
 * Convert a ForgeCMS nav node tree (site_navigation.header / .footer) into the
 * app's NavItem/SubMenuItem shape. A "group" node becomes a parent with its
 * children as submenu links; a "static" or "external" node becomes a flat link.
 * Returns an empty array when the field is null (nav not yet populated) so the
 * header and footer render without throwing.
 */
export function mapNavNodes(nodes?: ForgeCmsNavNode[] | null): MappedNavItem[] {
  const toLink = (node: ForgeCmsNavNode): MappedNavLink => {
    const target = resolveLinkTarget(node)
    return {
      label: node.labelOverride || "",
      // A group parent owns no route of its own; "#" keeps it rendering as its
      // dropdown's trigger rather than dropping the submenu with it.
      url: target?.href ?? "#",
      route: node.routePath || undefined,
      openInNewTab: target?.openInNewTab ?? false,
    }
  }

  return (nodes ?? []).map((node) => ({
    ...toLink(node),
    submenu: (node.children ?? []).map(toLink),
  }))
}

// ---------------------------------------------------------------------------
// Site settings (site title)
// ---------------------------------------------------------------------------

export const siteSettingsQuery = `
  query siteSettingsQuery {
    siteSettings {
      defaultPageTitle
    }
  }
`

// ---------------------------------------------------------------------------
// Social media (footer)
// ---------------------------------------------------------------------------

export const socialSettingsQuery = `
  query socialSettingsQuery {
    socialSettings {
      facebookUrl
      instagramUrl
      twitterUrl
      youtubeUrl
    }
  }
`

// ---------------------------------------------------------------------------
// Sponsors (sponsor bar)
// ---------------------------------------------------------------------------

// `preview` / `includeDrafts` are inert unless the request presents the preview
// key; `CMS_PREVIEW_TOKEN` is what makes them take effect, and it exists only in
// a developer's `.env.local`. The defaults keep the published read unchanged for
// every caller that passes no variables.
export const sponsorsQuery = `
  query sponsorsQuery($preview: Boolean = false, $includeDrafts: Boolean = false) {
    sponsorsCollection(preview: $preview, includeDrafts: $includeDrafts) {
      edges {
        node {
          id
          name
          slug
          sponsor_url
          logo {
            url
          }
        }
      }
    }
  }
`

export interface ForgeCmsSponsor {
  id: string
  name: string
  slug: string
  sponsor_url?: string | null
  logo?: { url?: string | null } | null
}
