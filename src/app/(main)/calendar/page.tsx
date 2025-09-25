import CalendarClient from "./calendar.client"
import type { Metadata, ResolvingMetadata } from "next"
import axios from "axios"

/**
 * Generate metadata for the page.
 */
export async function generateMetadata(
  props: { params: { slug: string } },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const url = new URL((await parent).metadataBase || "https://pghrugby.com")
  url.pathname = `/calendar`

  return {
    title: "Event Calendar | Pittsburgh Forge Rugby Club",
    description:
      "Stay updated with the latest events and matches of the Pittsburgh Forge Rugby Club. Check out our event calendar for upcoming games, training sessions, and community events.",
    alternates: {
      canonical: url.toString(),
    },
    openGraph: {
      url: url.toString(),
    },
  } satisfies Metadata
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY

// Define calendar IDs directly in the server component
const CALENDAR_IDS = [
  {
    name: "competition",
    id: "c_021137728cc9aebf8d1799bf3c92fa4acf991a3c0a8055178ac6edba8fb60f28@group.calendar.google.com",
  },
  {
    name: "matchesMens",
    id: "7c9bhcajrnm5qvceh40c6jr3879jsbgb@import.calendar.google.com",
  },
  {
    name: "matchesWomens",
    id: "f38u06tgnthp9blcu2b5au8qlot6umha@import.calendar.google.com",
  },
  {
    name: "eventsRuggers",
    id: "c_c9c1cf3647d1c1db4873d1a2120ab9546db1056e2f45dea4af44cf27e16c4372@group.calendar.google.com",
  },
  {
    name: "eventsSocial",
    id: "c_f482db8e79e3df1f702366531b13f333a0e74f1aaa4012a2e1f6db59e5e6307d@group.calendar.google.com",
  },
  {
    name: "eventsYouth",
    id: "c_7fd1e2952c2ba5969ea3aa38ff9622b3f42e9db15525476f958a2dbc3093cf57@group.calendar.google.com",
  },
  {
    name: "eventsOther",
    id: "c_69623bf661cb11b20fa5526271b80508634843b5f0f73a99b7ea775eaaf5a484@group.calendar.google.com",
  },
  {
    name: "tournaments",
    id: "c_e9833bd6f085edf9cb4c588384a55ad454d9b685210ccc6bc9401353d9e9c8c5@group.calendar.google.com",
  },
]

const fetchGoogleCalendarEvents = async () => {
  try {
    if (!API_KEY || CALENDAR_IDS.length === 0) {
      throw new Error(
        "Missing API key or Calendar IDs. Please check your configuration."
      )
    }

    const allEvents = []

    for (const { id: calendarId, name: calendarName } of CALENDAR_IDS) {
      const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?key=${API_KEY}`

      // Fetch future events
      const futureRes = await axios.get(baseUrl, {
        params: {
          timeMin: new Date().toISOString(),
          maxResults: 200,
          singleEvents: true,
          orderBy: "startTime",
        },
      })

      if (futureRes.data.items) {
        const futureEvents = futureRes.data.items.map(
          (event: any, index: number) => ({
            id: `${calendarId}-future-${index + 1}`,
            title: event.summary || "No Title",
            text: event.description || null,
            start:
              event.start?.dateTime || event.start?.date || "Unknown Start",
            end: event.end?.dateTime || event.end?.date || "Unknown End",
            location: event.location || null,
            htmlLink: event.htmlLink || null,
            calendarName,
          })
        )
        allEvents.push(...futureEvents)
      }

      // Fetch past events
      const pastRes = await axios.get(baseUrl, {
        params: {
          timeMax: new Date().toISOString(),
          maxResults: 200,
          singleEvents: true,
          orderBy: "startTime",
        },
      })

      if (pastRes.data.items) {
        const pastEvents = pastRes.data.items.map(
          (event: any, index: number) => ({
            id: `${calendarId}-past-${index + 1}`,
            title: event.summary || "No Title",
            text: event.description || null,
            start:
              event.start?.dateTime || event.start?.date || "Unknown Start",
            end: event.end?.dateTime || event.end?.date || "Unknown End",
            location: event.location || null,
            htmlLink: event.htmlLink || null,
            calendarName,
          })
        )
        allEvents.push(...pastEvents)
      }
    }

    if (allEvents.length === 0) {
      console.warn("No events found in the calendars.")
    }

    return allEvents
  } catch (error: any) {
    console.error("Error fetching events from Google Calendar:", error)
    return []
  }
}

export default async function Calendar() {
  let events: {
    id: string
    title: string
    text: string
    start: string
    end: string
    calendarIdName: string // Add calendarIdName to the event type
  }[] = []

  try {
    events = await fetchGoogleCalendarEvents()
  } catch (error) {
    console.error("Error fetching events:", error)
  }

  return <CalendarClient events={events} />
}
