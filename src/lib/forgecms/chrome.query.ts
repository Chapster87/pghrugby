// ForgeCMS site-chrome queries (nav, settings, socials, sponsors).
// Replaces the Sanity `navigation` / `settings` / `socialMedia` / `sponsor` /
// `sponsorBar` document types (see docs/agents/sanity-content-inventory.md,
// Phase 4). Note the snake_case `site_navigation` entry point — the one chrome
// model queried by snake_case rather than camelCase.

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

// ForgeCMS stores nav nodes as free-form JSON in the linktree shape: a node is
// either a "group" (renders a label + children) or a "static" (renders a link
// to routePath). Both may carry a labelOverride.
export interface ForgeCmsNavNode {
  id: string
  type: "group" | "static"
  labelOverride?: string | null
  routePath?: string | null
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
 * Convert a ForgeCMS nav node tree (site_navigation.header / .footer) into the
 * app's NavItem/SubMenuItem shape. A "group" node becomes a parent with its
 * children as submenu links; a "static" node becomes a flat link. Returns an
 * empty array when the field is null (nav not yet populated) so the header and
 * footer render without throwing.
 */
export function mapNavNodes(nodes?: ForgeCmsNavNode[] | null): MappedNavItem[] {
  return (nodes ?? []).map((node) => ({
    label: node.labelOverride || "",
    url: node.routePath || "#",
    route: node.routePath || undefined,
    openInNewTab: false,
    submenu: (node.children ?? []).map((child) => ({
      label: child.labelOverride || "",
      url: child.routePath || "#",
      route: child.routePath || undefined,
      openInNewTab: false,
    })),
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

export const sponsorsQuery = `
  query sponsorsQuery {
    sponsorsCollection {
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
