import type { Demo } from "../types"
import MinicartFlyoutPrototype from "./prototype"

/**
 * Minicart flyout prototype (wayfinder ticket #63) — the chosen "Grouped cards"
 * direction, retained as the implementation reference. Dev-only: registered on
 * the workbench, which is never served in production.
 */
const minicartFlyoutDemo: Demo = {
  id: "minicart-flyout",
  title: "Minicart flyout prototype",
  description:
    "PROTOTYPE — the chosen Grouped-cards minicart: one Dialog, an in-place registration edit panel, and a standardized qty/price rail.",
  render: () => <MinicartFlyoutPrototype />,
}

export default minicartFlyoutDemo
