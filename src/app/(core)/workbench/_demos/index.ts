import buttonDemo from "./button"
import dialogDemo from "./dialog"
import formControlsDemo from "./form-controls"
import minicartFlyoutDemo from "./minicart-flyout"
import pdpLayoutDemo from "./pdp-layout"

import type { Demo } from "./types"

/**
 * The workbench registry. Entries list in this order on the hub and each gets a
 * child page at `/workbench/<id>`, so demoing a new shared component is one
 * import plus one array entry — no page changes.
 */
export const demos: Demo[] = [
  buttonDemo,
  formControlsDemo,
  dialogDemo,
  pdpLayoutDemo,
  minicartFlyoutDemo,
]

/**
 * Resolve a demo by its id, for the `/workbench/[demo]` child route.
 *
 * @param id - The demo's `id` (its URL segment).
 * @returns The matching demo, or `undefined` when no demo has that id.
 */
export function getDemo(id: string): Demo | undefined {
  return demos.find((demo) => demo.id === id)
}
