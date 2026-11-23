import type { Metadata } from "next"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { notFound } from "next/navigation"

import type { Snapshot, StatusFile, WorkbenchRow } from "@/lib/audit/types"

import AuditTable from "./_components/audit-table"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Page audit | Pittsburgh Forge Rugby Club",
  robots: { index: false, follow: false },
}

const SNAPSHOT_PATH = join(
  process.cwd(),
  "src/app/(core)/workbench/audit/snapshot.json"
)
const STATUS_PATH = join(
  process.cwd(),
  "src/app/(core)/workbench/audit/status.json"
)

/**
 * `/workbench/audit` — the page-audit workbench. Dev-only; 404s in production.
 * Reads the committed snapshot and status files at request time and merges them
 * into the rows the table renders.
 */
export default async function AuditPage() {
  if (process.env.NODE_ENV === "production") {
    notFound()
  }

  const [snapshotRaw, statusRaw] = await Promise.all([
    readFile(SNAPSHOT_PATH, "utf8"),
    readFile(STATUS_PATH, "utf8"),
  ])
  const snapshot = JSON.parse(snapshotRaw) as Snapshot
  const status = JSON.parse(statusRaw) as StatusFile

  const rows: WorkbenchRow[] = snapshot.rows.map((row) => {
    const entry = status.rows[row.id]
    return {
      id: row.id,
      side: row.side,
      source: row.source,
      type: row.type,
      url: row.url,
      title: row.title,
      decision: entry?.decision ?? row.decision,
      target: entry?.confirmedTarget ?? row.target,
      status: entry?.status ?? "todo",
      note: entry?.note,
    }
  })

  return (
    <AuditTable
      rows={rows}
      generatedAtLabel={new Date(snapshot.generatedAt).toLocaleString()}
    />
  )
}
