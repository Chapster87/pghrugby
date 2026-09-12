import { Suspense } from "react"

import type { Demo } from "../types"
import PdpLayoutPrototype from "./prototype"

/**
 * PDP layout prototype (wayfinder ticket #62) — retained as the reference for
 * implementing the chosen PDP layout. Rendered against three fixtures via
 * `?product=`. Dev-only: registered on the workbench, which is never served in
 * production.
 */
const pdpLayoutDemo: Demo = {
  id: "pdp-layout",
  title: "PDP layout prototype",
  description:
    "PROTOTYPE — the chosen PDP layout (side-by-side), iterated via ?product= against the golf, orphan, and variation fixtures.",
  render: () => (
    <Suspense fallback={<p>Loading prototype…</p>}>
      <PdpLayoutPrototype />
    </Suspense>
  ),
}

export default pdpLayoutDemo
