import type { ReactNode } from "react"

/**
 * One workbench demo. Each shared/wrapper component ships one `Demo`; the
 * registry in `./index.ts` collects them, so each demo gets a hub entry and a
 * child page at `/workbench/<id>` without the pages changing.
 */
export type Demo = {
  /** Anchor id, React key, and URL segment; kebab-case, matching the component name. */
  id: string
  /** Hub card and child-page heading — the component's name. */
  title: string
  /** Optional one-liner on what the demo covers. */
  description?: string
  /**
   * Renders the specimens under test. Keep this server-safe and delegate the
   * actual specimens to a `"use client"` component (`./specimens`): the shared
   * wrappers are compound client components, and property access such as
   * `Checkbox.Root` is only defined on the client, not on a server-side client
   * reference.
   */
  render: () => ReactNode
}
