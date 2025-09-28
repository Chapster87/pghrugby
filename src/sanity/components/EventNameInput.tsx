import React from "react"
import { StringInputProps, useFormValue, PatchEvent, set } from "sanity"
import { useClient } from "sanity"

const EventNameInput: React.FC<StringInputProps> = (props) => {
  const { value, onChange, schemaType, elementProps, renderDefault } = props

  // Using useFormValue to retrieve homeTeam and awayTeam
  const homeTeam = useFormValue(["homeTeam"])
  const awayTeam = useFormValue(["awayTeam"])

  // Sanity client for fetching data
  const client = useClient()

  const generateEventName = async () => {
    const homeTeamRef = (homeTeam as any)?._ref
    const awayTeamRef = (awayTeam as any)?._ref

    if (!homeTeamRef || !awayTeamRef) {
      return
    }

    try {
      // Fetch the actual team names and additional data from Sanity
      const [homeTeamData, awayTeamData] = await Promise.all([
        client.fetch(
          `*[_id == $id][0]{teamName, "league": league->shortName, "division": division->shortName}`,
          { id: homeTeamRef }
        ),
        client.fetch(
          `*[_id == $id][0]{teamName, "league": league->shortName, "division": division->shortName}`,
          { id: awayTeamRef }
        ),
      ])

      const homeTeamName = homeTeamData?.teamName || "Unknown Team"
      const awayTeamName = awayTeamData?.teamName || "Unknown Team"
      const homeLeagueShortName = homeTeamData?.league || ""
      const homeDivisionShortName = homeTeamData?.division || ""
      const awayLeagueShortName = awayTeamData?.league || ""
      const awayDivisionShortName = awayTeamData?.division || ""

      const isForgeHome = homeTeamName.includes("Pittsburgh Forge")
      const isForgeAway = awayTeamName.includes("Pittsburgh Forge")

      let eventName = ""

      if (isForgeHome) {
        eventName = `Pittsburgh Forge ${homeLeagueShortName} ${homeDivisionShortName} vs. ${awayTeamName}`
      } else if (isForgeAway) {
        eventName = `Pittsburgh Forge ${awayLeagueShortName} ${awayDivisionShortName} @ ${homeTeamName}`
      } else {
        eventName = `${homeTeamName} (${homeLeagueShortName} ${homeDivisionShortName}) vs. ${awayTeamName} (${awayLeagueShortName} ${awayDivisionShortName})`
      }

      onChange(PatchEvent.from(set(eventName)))
    } catch (error) {
      console.error("Error fetching team names:", error)
    }
  }

  return (
    <div>
      {renderDefault({
        ...props,
        value,
        onChange,
        schemaType,
        elementProps,
      })}
      <button
        type="button"
        onClick={generateEventName}
        className="bg-transparent hover:bg-gray-100 text-blue-500 font-semibold py-2 px-4 border border-blue-500 rounded-sm shadow-sm"
      >
        Generate Name
      </button>
    </div>
  )
}

export default EventNameInput
