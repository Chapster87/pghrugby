import type { ComponentType } from "react"

import type { FieldRendererProps } from "@/app/admin/editor/[model]/_components/record-form/types"

import StandingsField, { StandingRow } from "./standings-field"

/**
 * Seam adapter: core `FieldRendererProps` → host `StandingsField`.
 *
 * Reads sibling league/division/season via `getFieldValue` so the editor can
 * filter the team picker without core knowing about standings.
 */
export const StandingsEditor: ComponentType<FieldRendererProps> =
  function StandingsEditor({
    field,
    value,
    disabled,
    onChange,
    getFieldValue,
  }: FieldRendererProps) {
    const extractId = (val: unknown) => {
      if (Array.isArray(val)) return val[0]
      if (typeof val === "object" && val !== null) {
        const obj = val as Record<string, unknown>
        return obj.id as string | undefined
      }
      return val as string | undefined
    }

    const leagueId = extractId(getFieldValue("league"))
    const divisionId = extractId(getFieldValue("division"))
    const seasonId = extractId(getFieldValue("season"))

    return (
      <StandingsField
        label={field.field_label}
        description={field.field_description ?? undefined}
        fieldNote={field.field_note ?? undefined}
        required={field.is_required}
        disabled={disabled}
        value={(value as StandingRow[]) || []}
        onChange={(val) => onChange(val)}
        leagueId={leagueId}
        divisionId={divisionId}
        seasonId={seasonId}
      />
    )
  }
