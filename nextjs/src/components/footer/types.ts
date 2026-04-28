export interface SubMenuItem {
  label: string
  url: string
  route?: string // Added route property
  openInNewTab: boolean
}

export interface NavItem extends SubMenuItem {
  submenu: SubMenuItem[]
}

export interface FormattedNavData {
  navigation: NavItem[]
}

export type SocialMedia = {
  facebook: string
  instagram: string
  twitter: string
  youtube: string
}
