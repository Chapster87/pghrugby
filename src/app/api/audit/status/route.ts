import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { NextResponse } from "next/server"

import type { Decision, Status, StatusFile } from "@/lib/audit/types"

const STATUS_PATH = join(
  process.cwd(),
  "src/app/(core)/workbench/audit/status.json"
)

const STATUSES: Status[] = ["todo", "in-review", "done", "won't-migrate"]
const DECISIONS: Decision[] = [
  "keep",
  "redirect",
  "new-page",
  "404",
  "undecided",
]

/**
 * Dev-only status persistence for the audit workbench. Writes the owner's
 * status/decision/note changes back to the committed status file. 404s in
 * production, like the workbench route itself.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not found", { status: 404 })
  }

  let body: {
    id?: string
    status?: Status
    decision?: Decision
    confirmedTarget?: string | null
    note?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (!body.id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }
  if (body.status !== undefined && !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }
  if (body.decision !== undefined && !DECISIONS.includes(body.decision)) {
    return NextResponse.json({ error: "Invalid decision" }, { status: 400 })
  }

  const raw = await readFile(STATUS_PATH, "utf8")
  const file = JSON.parse(raw) as StatusFile
  const entry = file.rows[body.id] ?? { status: "todo" as Status }

  if (body.status !== undefined) entry.status = body.status
  if (body.decision !== undefined) entry.decision = body.decision
  if (body.confirmedTarget !== undefined) {
    entry.confirmedTarget = body.confirmedTarget ?? undefined
  }
  if (body.note !== undefined) entry.note = body.note

  file.rows[body.id] = entry
  file.updatedAt = new Date().toISOString()

  await writeFile(STATUS_PATH, JSON.stringify(file, null, 2) + "\n", "utf8")

  return NextResponse.json(entry)
}
