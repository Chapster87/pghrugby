import { registerFieldType } from "@/app/admin/seam"

import { StandingsEditor } from "./standings-editor"

/**
 * Registers the host `standings_table` field type on the forgecms consumer seam.
 *
 * Side-effect import from `src/cms/admin-registry.tsx` populates the empty core
 * registry before admin field renderers run. Lives outside the core mount
 * (`src/app/admin/`) so `forgecms update` never overwrites it.
 */
export function registerStandingsFieldType(): void {
  registerFieldType({
    type: "standings_table",
    label: "Rugby Standings",
    description: "Rugby League standings table with team stats.",
    category: "advanced",
    icon: "award",
    dbType: "jsonb",
    Editor: StandingsEditor,
  })
}

registerStandingsFieldType()
