/**
 * THIS FILE IS AUTO-GENERATED. DO NOT EDIT DIRECTLY.
 * Run 'pnpm sync-types' to update.
 */

export type StorageProvider = "cloudinary" | "supabase" | "local";

export interface MediaAsset {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  file_name?: string;
  url: string;
  type: string;
  size: number;
  width?: number;
  height?: number;
  alt_text?: string;
  folder: string;
  tags: string[];
  storage_provider: StorageProvider;
  provider_metadata: Record<string, unknown>;
  created_by?: string;
}

export type CMSStatus = "published" | "draft" | "changed";

export interface SeoMetadata {
  title?: string;
  description?: string;
  keywords?: string;
  noIndex?: boolean;
  ogImage?: MediaAsset;
  ogTitle?: string;
  ogDescription?: string;
}

export type NavigationItemType = "internal" | "external" | "static" | "group";

export interface NavigationItem {
  id: string;
  type: NavigationItemType;
  labelOverride?: string;
  linkedRecord?: {
    id: string;
    modelId: string;
    displayName?: string;
    slug?: string;
  };
  url?: string;
  openInNewTab?: boolean;
  noFollow?: boolean;
  routePath?: string;
  children?: NavigationItem[];
}

export type NavigationData = NavigationItem[];

export interface ModularContentBlock {
  id: string;
  type: string;
  data: unknown;
}

export type ModularContentData = ModularContentBlock[];

export interface StandingsRow {
  team_id: string;
  team_logo?: MediaAsset;
  team_name?: string;
  played?: number;
  won?: number;
  drawn?: number;
  lost?: number;
  points_for?: number;
  points_against?: number;
  points_diff?: number;
  bonus_points?: number;
  points?: number;
  [key: string]: unknown;
}

export type StandingsData = StandingsRow[];

export interface Authors {
  id: string;
  created_at: string;
  updated_at: string;
  status: CMSStatus;
  _draft?: unknown;
  created_by?: string;
  name?: string;
  updated_by?: string;
  slug: string;
  bio?: string;
  avatar_url?: string;
  user_id?: unknown;
}

export interface Boom {
  id: string;
  created_at: string;
  updated_at: string;
  status: CMSStatus;
  _draft?: unknown;
}

export interface Divisions {
  id: string;
  created_at: string;
  updated_at: string;
  status: CMSStatus;
  _draft?: unknown;
  name: string;
  slug: string;
  short_name?: string;
}

export interface Leagues {
  id: string;
  created_at: string;
  updated_at: string;
  status: CMSStatus;
  _draft?: unknown;
  name: string;
  slug: string;
  short_name?: string;
}

export interface Linktree {
  id: string;
  created_at: string;
  updated_at: string;
  status: CMSStatus;
  _draft?: unknown;
  top_links?: NavigationData;
  club_info?: NavigationData;
}

export interface Matches {
  id: string;
  created_at: string;
  updated_at: string;
  status: CMSStatus;
  _draft?: unknown;
  match_date_time: string;
  league: Leagues;
  division: Divisions;
  season: Seasons;
  match_type?: string;
  home_team: Teams;
  away_team: Teams;
  event_name: string;
  slug: string;
  home_team_score?: number;
  away_team_score?: number;
}

export interface Pages {
  id: string;
  created_at: string;
  updated_at: string;
  status: CMSStatus;
  _draft?: unknown;
  title: string;
  slug: string;
  author?: Authors;
  modular_blocks?: ModularContentData;
  content_dynamic?: ModularContentData;
  structured_text?: string;
  long_text?: string;
  color?: string;
  media?: MediaAsset;
  rich_text?: string;
  tag_list?: string[];
  seo?: SeoMetadata;
  page_link?: Pages;
  navigation?: NavigationData;
  standings_table?: StandingsData;
}

export interface Seasons {
  id: string;
  created_at: string;
  updated_at: string;
  status: CMSStatus;
  _draft?: unknown;
  display_name?: string;
  year?: number;
  season?: string;
  slug: string;
}

export interface SiteNavigation {
  id: string;
  created_at: string;
  updated_at: string;
  status: CMSStatus;
  _draft?: unknown;
  header?: NavigationData;
  footer?: NavigationData;
}

export interface Sponsors {
  id: string;
  created_at: string;
  updated_at: string;
  status: CMSStatus;
  _draft?: unknown;
  name: string;
  slug: string;
  logo: MediaAsset;
  sponsor_url?: string;
  article?: unknown;
}

export interface Standings {
  id: string;
  created_at: string;
  updated_at: string;
  status: CMSStatus;
  _draft?: unknown;
  season: Seasons;
  slug?: string;
  league: Leagues;
  division: Divisions;
  league_standings: StandingsData;
}

export interface Teams {
  id: string;
  created_at: string;
  updated_at: string;
  status: CMSStatus;
  _draft?: unknown;
  team_name: string;
  slug: string;
  team_logo?: MediaAsset;
  league?: Leagues;
  division?: Divisions[];
  seasons?: Seasons[];
  short_name?: string;
}

export interface Testing {
  id: string;
  created_at: string;
  updated_at: string;
  status: CMSStatus;
  _draft?: unknown;
}

export interface TestingCopy {
  id: string;
  created_at: string;
  updated_at: string;
  status: CMSStatus;
  _draft?: unknown;
}

export interface CMSModelMap {
  authors: Authors;
  boom: Boom;
  divisions: Divisions;
  leagues: Leagues;
  linktree: Linktree;
  matches: Matches;
  pages: Pages;
  seasons: Seasons;
  site_navigation: SiteNavigation;
  sponsors: Sponsors;
  standings: Standings;
  teams: Teams;
  testing: Testing;
  testing_copy: TestingCopy;
}

export type CMSModelName = keyof CMSModelMap;
export type AnyCMSModel = CMSModelMap[CMSModelName];

/**
 * BLOCK TYPES
 */

export interface Test {
  id: string;
  created_at: string;
  updated_at: string;
  zxcv?: string;
}

export interface Test2 {
  id: string;
  created_at: string;
  updated_at: string;
  division: Divisions;
  league: Leagues;
  season: Seasons;
}

export interface CMSBlockMap {
  test: Test;
  test_2: Test2;
}

export type CMSBlockName = keyof CMSBlockMap;
