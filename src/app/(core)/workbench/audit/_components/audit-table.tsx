"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import clsx from "clsx"

import type { Decision, Source, Status, WorkbenchRow } from "@/lib/audit/types"

import s from "../style.module.css"

const STATUSES: Status[] = ["todo", "in-review", "done", "won't-migrate"]
const DECISIONS: Decision[] = [
  "keep",
  "redirect",
  "new-page",
  "404",
  "undecided",
]
const SOURCES: Source[] = ["datocms", "forgecms", "nextjs", "wordpress"]
const SIDES: ("new" | "wordpress")[] = ["new", "wordpress"]

/** A URL param, validated against the values the filter accepts. */
const paramOr = <T extends string>(
  value: string | null,
  allowed: readonly T[],
  fallback: T
): T =>
  value !== null && allowed.includes(value as T) ? (value as T) : fallback

/** The URL a row resolves to: a WordPress redirect target, or its own URL. */
const resolvedUrl = (row: WorkbenchRow) =>
  row.side === "wordpress" ? row.target ?? row.url : row.url

/** Row tint by status, so audit progress is visible at a glance. */
const statusClass = (status: Status) => {
  switch (status) {
    case "in-review":
      return s.rowInReview
    case "done":
      return s.rowDone
    case "won't-migrate":
      return s.rowWontMigrate
    default:
      return s.rowTodo
  }
}

type Section =
  | "page"
  | "post"
  | "product"
  | "competition"
  | "calendar"
  | "other"

const COMPETITION_TYPES = new Set([
  "event",
  "table",
  "team",
  "player",
  "staff",
  "venue",
  "league",
  "season",
])

/** The part of the site a row belongs to, for working through sections. */
const sectionOf = (row: WorkbenchRow): Section => {
  if (row.type === "calendar" || row.url.startsWith("/calendar")) {
    return "calendar"
  }
  if (
    COMPETITION_TYPES.has(row.type) ||
    row.url.startsWith("/matches") ||
    row.url.startsWith("/mens-schedule") ||
    row.url.startsWith("/womens-schedule") ||
    row.url.startsWith("/mens-standings") ||
    row.url.startsWith("/womens-standings")
  ) {
    return "competition"
  }
  switch (row.type) {
    case "page":
    case "static":
    case "forgecms":
      return "page"
    case "post":
      return "post"
    case "pdp":
    case "product":
    case "product-category":
    case "product-tag":
      return "product"
    default:
      return "other"
  }
}

const sourceClass = (source: Source) => {
  switch (source) {
    case "datocms":
      return s.sourceDatocms
    case "forgecms":
      return s.sourceForgecms
    case "wordpress":
      return s.sourceWordpress
    default:
      return s.sourceNextjs
  }
}

type AuditTableProps = {
  rows: WorkbenchRow[]
  generatedAtLabel: string
}

/**
 * The audit table. Rows are grouped by the URL they resolve to, so a WordPress
 * page and its new-site mate sit next to each other. Status is editable on
 * every row; Decision only applies to WordPress rows.
 */
export default function AuditTable({
  rows: initialRows,
  generatedAtLabel,
}: AuditTableProps) {
  // Filters live in the query string, so a refresh (or a shared link) keeps the
  // view you were looking at. `useSearchParams` is SSR-safe; writes go through
  // `history.replaceState` below so typing in the search box doesn't trigger a
  // server navigation on every keystroke.
  const searchParams = useSearchParams()

  const [rows, setRows] = useState<WorkbenchRow[]>(initialRows)
  const [source, setSource] = useState<"all" | Source>(() =>
    paramOr(searchParams.get("source"), ["all", ...SOURCES], "all")
  )
  const [side, setSide] = useState<"all" | "new" | "wordpress">(() =>
    paramOr(searchParams.get("side"), ["all", ...SIDES], "all")
  )
  const [section, setSection] = useState<"all" | Section>(() =>
    paramOr(
      searchParams.get("section"),
      ["all", "page", "post", "product", "competition", "calendar", "other"],
      "all"
    )
  )
  const [decision, setDecision] = useState<"all" | Decision>(() =>
    paramOr(searchParams.get("decision"), ["all", ...DECISIONS], "all")
  )
  const [status, setStatus] = useState<"all" | Status>(() =>
    paramOr(searchParams.get("status"), ["all", ...STATUSES], "all")
  )
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "")
  const [hideCompleted, setHideCompleted] = useState(
    () => searchParams.get("hide") === "1"
  )

  useEffect(() => {
    const params = new URLSearchParams()
    if (source !== "all") params.set("source", source)
    if (side !== "all") params.set("side", side)
    if (section !== "all") params.set("section", section)
    if (decision !== "all") params.set("decision", decision)
    if (status !== "all") params.set("status", status)
    if (query) params.set("q", query)
    if (hideCompleted) params.set("hide", "1")

    const search = params.toString()
    window.history.replaceState(
      null,
      "",
      search ? `?${search}` : window.location.pathname
    )
  }, [source, side, section, decision, status, query, hideCompleted])

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        if (source !== "all" && row.source !== source) return false
        if (side !== "all" && row.side !== side) return false
        if (section !== "all" && sectionOf(row) !== section) return false
        if (decision !== "all" && row.decision !== decision) return false
        if (status !== "all" && row.status !== status) return false
        if (
          hideCompleted &&
          (row.status === "done" || row.status === "won't-migrate")
        ) {
          return false
        }
        if (
          query &&
          !`${row.url} ${row.title}`.toLowerCase().includes(query.toLowerCase())
        ) {
          return false
        }
        return true
      }),
    [rows, source, side, section, decision, status, query, hideCompleted]
  )

  // Group mates: sort by the resolved URL, new-site row first.
  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const ga = resolvedUrl(a)
        const gb = resolvedUrl(b)
        if (ga !== gb) return ga.localeCompare(gb)
        if (a.side === b.side) return 0
        return a.side === "new" ? -1 : 1
      }),
    [filtered]
  )

  const counts = useMemo(
    () => ({
      total: rows.length,
      new: rows.filter((r) => r.side === "new").length,
      wp: rows.filter((r) => r.side === "wordpress").length,
      undecided: rows.filter((r) => r.decision === "undecided").length,
      complete: rows.filter(
        (r) => r.status === "done" || r.status === "won't-migrate"
      ).length,
    }),
    [rows]
  )

  const persist = async (
    id: string,
    patch: { status?: Status; decision?: Decision }
  ) => {
    try {
      const res = await fetch("/api/audit/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      })
      if (!res.ok) {
        console.error("Failed to persist audit status", await res.text())
      }
    } catch (error) {
      console.error("Failed to persist audit status", error)
    }
  }

  const setRowStatus = (id: string, value: Status) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: value } : r))
    )
    void persist(id, { status: value })
  }

  const setRowDecision = (id: string, value: Decision) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, decision: value } : r))
    )
    void persist(id, { decision: value })
  }

  const mateFor = (row: WorkbenchRow): string | undefined => {
    const key = resolvedUrl(row)
    const mate = rows.find(
      (r) => r.id !== row.id && r.side !== row.side && resolvedUrl(r) === key
    )
    return mate?.url
  }

  return (
    <div className={s.workbench}>
      <header className={s.header}>
        <h1 className={s.title}>Page audit</h1>
        <p className={s.subtitle}>
          {counts.total} rows · {counts.new} new-site · {counts.wp} WordPress ·{" "}
          {counts.undecided} undecided · {counts.complete} complete · generated{" "}
          {generatedAtLabel}
        </p>
      </header>

      <div className={s.toolbar}>
        <input
          className={s.search}
          placeholder="Filter by URL or title…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className={s.select}
          value={source}
          onChange={(e) => setSource(e.target.value as typeof source)}
        >
          <option value="all">All sources</option>
          <option value="datocms">datocms</option>
          <option value="forgecms">forgecms</option>
          <option value="nextjs">nextjs</option>
          <option value="wordpress">wordpress</option>
        </select>
        <select
          className={s.select}
          value={side}
          onChange={(e) => setSide(e.target.value as typeof side)}
        >
          <option value="all">All sides</option>
          <option value="new">New site</option>
          <option value="wordpress">WordPress</option>
        </select>
        <select
          className={s.select}
          value={section}
          onChange={(e) => setSection(e.target.value as typeof section)}
        >
          <option value="all">All stacks</option>
          <option value="page">page</option>
          <option value="post">post</option>
          <option value="product">product</option>
          <option value="competition">competition</option>
          <option value="calendar">calendar</option>
          <option value="other">other</option>
        </select>
        <select
          className={s.select}
          value={decision}
          onChange={(e) => setDecision(e.target.value as typeof decision)}
        >
          <option value="all">All decisions</option>
          {DECISIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <select
          className={s.select}
          value={status}
          onChange={(e) => setStatus(e.target.value as typeof status)}
        >
          <option value="all">All statuses</option>
          {STATUSES.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
        <label className={s.toggle}>
          <input
            type="checkbox"
            checked={hideCompleted}
            onChange={(e) => setHideCompleted(e.target.checked)}
          />
          Hide completed
        </label>
      </div>

      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>Source</th>
              <th>Side</th>
              <th>Stack</th>
              <th>URL</th>
              <th>Title</th>
              <th>Decision</th>
              <th>Mate</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => {
              const next = sorted[i + 1]
              const isGroupEnd =
                !!next && resolvedUrl(next) !== resolvedUrl(row)
              return (
                <tr
                  key={row.id}
                  className={clsx(
                    statusClass(row.status),
                    isGroupEnd && s.groupEnd
                  )}
                >
                  <td>
                    <span
                      className={clsx(s.sourceBadge, sourceClass(row.source))}
                    >
                      {row.source}
                    </span>
                  </td>
                  <td>{row.side}</td>
                  <td>{sectionOf(row)}</td>
                  <td className={s.url}>
                    {/* Relative on purpose: the point is to watch this site's
                        redirects and 404s, so a WordPress row's legacy path is
                        opened against the current origin too. */}
                    <a
                      className={s.urlLink}
                      href={row.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {row.url}
                    </a>
                  </td>
                  <td>{row.title}</td>
                  <td>
                    {row.side === "wordpress" ? (
                      <select
                        className={s.inlineSelect}
                        value={row.decision}
                        onChange={(e) =>
                          setRowDecision(row.id, e.target.value as Decision)
                        }
                      >
                        {DECISIONS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={s.muted}>—</span>
                    )}
                  </td>
                  <td className={s.url}>
                    {mateFor(row) ?? <span className={s.muted}>none</span>}
                  </td>
                  <td>
                    <select
                      className={s.inlineSelect}
                      value={row.status}
                      onChange={(e) =>
                        setRowStatus(row.id, e.target.value as Status)
                      }
                    >
                      {STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
