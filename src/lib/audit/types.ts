// Shared types for the page-audit workbench. See #178, #179, #180.

export type Side = "new" | "wordpress"
export type Source = "datocms" | "forgecms" | "static" | "pdp" | "wordpress"
export type Decision = "keep" | "redirect" | "new-page" | "404" | "undecided"
export type Status = "todo" | "in-review" | "done" | "won't-migrate"

export type SnapshotRow = {
  id: string
  side: Side
  source: Source
  type: string
  url: string
  title: string
  recordId?: string
  wpId?: number
  /** Proposed decision for a WordPress row. */
  decision?: Decision
  /** Proposed redirect target for a WordPress row. */
  target?: string
  /** The row on the other side that this row pairs with. */
  mateId?: string
  mateUrl?: string
}

export type Snapshot = {
  generatedAt: string
  sources: Record<string, number>
  redirects: { source: string; destination: string; permanent: boolean }[]
  rows: SnapshotRow[]
}

export type StatusEntry = {
  status: Status
  /** Owner-confirmed decision (WordPress rows). Falls back to the snapshot proposal. */
  decision?: Decision
  /** Owner-confirmed redirect target (WordPress rows). */
  confirmedTarget?: string
  note?: string
}

export type StatusFile = {
  version: 1
  updatedAt: string
  rows: Record<string, StatusEntry>
}

/** A snapshot row merged with its status entry, as the workbench renders it. */
export type WorkbenchRow = {
  id: string
  side: Side
  source: Source
  type: string
  url: string
  title: string
  decision?: Decision
  target?: string
  status: Status
  note?: string
}
